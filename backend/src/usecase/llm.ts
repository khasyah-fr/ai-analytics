import { OpenAI } from 'openai';
import { API_KEY, LLM_BASE_URL, LLM_MODEL } from '../config/index.ts';
import { METRICS, DIMENSIONS, FIELDS, getRegistrySummaryForPrompt, QueryMetricInputSchema, ForecastInputSchema } from '../repository/zod.ts';
import { runQueryMetric } from '../tools/query.ts';
import { runForecast } from '../tools/forecast.ts';

let client: OpenAI | null = null;

export function getLLMClient(): OpenAI {
  if (client) return client;
  if (!API_KEY) throw new Error('API key is required');
  
  client = new OpenAI({ apiKey: API_KEY, baseURL: LLM_BASE_URL });
  return client;
}

export const SYSTEM_PROMPT = `You are a logistics analytics assistant.
Tools: \`query_metric\` (descriptive analytics) and \`forecast\` (demand prediction).
Job: Interpret question, pick tool, call with clean inputs. Never write SQL or invent data.
If query is unsupported, reply with plain text starting with "UNSUPPORTED:" followed by a short reason.

Rules:
- Chaining, multi-step queries, or comparisons (e.g., comparing Q1 vs Q3) are UNSUPPORTED.
- Out-of-bounds parameters (e.g., horizon > 6 months) are UNSUPPORTED. Do not clip values.
- Today is 2026-05-05. Data is 2025-01-01 to 2025-12-30 only. "Last month" means Dec 2025.
- SKU-level forecasting is UNSUPPORTED. Use product_category grain instead.

REGISTRY:
${getRegistrySummaryForPrompt()}`;

export function getAllTools(): any[] {
  return [
    {
      type: 'function',
      function: {
        name: 'query_metric',
        description: 'Compute a metric, optionally with fields, time grain, and filters.',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            metric: { type: 'string', enum: Object.keys(METRICS) },
            fields: { type: ['string', 'null'], enum: [...FIELDS, null] },
            time_grain: { type: 'string', enum: ['day', 'week', 'month', 'year', 'none'], default: 'none' },
            filters: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  field: { type: 'string', enum: Object.keys(DIMENSIONS) },
                  op: { type: 'string', enum: ['eq', 'in'] },
                  value: {}
                },
                required: ['field', 'op', 'value']
              }
            },
            date_from: { type: ['string', 'null'], format: 'date' },
            date_to: { type: ['string', 'null'], format: 'date' },
            limit: { type: 'integer', minimum: 1, maximum: 1000, default: 100 }
          },
          required: ['metric']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'forecast',
        description: 'Forecast monthly orders for a product category (1-6 months horizon).',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            grain: { type: 'string', enum: ['product_category'], default: 'product_category' },
            entity: { type: 'string', description: 'Category name, e.g. CRAYON' },
            horizon_months: { type: 'integer', minimum: 1, maximum: 6 },
            method: { type: 'string', enum: ['auto', 'moving_average', 'linear_trend'], default: 'auto' }
          },
          required: ['entity', 'horizon_months']
        }
      }
    }
  ];
}

function fallback(reason: string) {
  return { kind: 'unsupported', message: reason, supported_metrics: Object.keys(METRICS), supported_fields: FIELDS };
}

export async function askQuestion(question: string): Promise<any> {
  const openai = getLLMClient();
  
  const completion = await openai.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: question }
    ],
    tools: getAllTools(),
    tool_choice: 'auto',
    temperature: 0.1
  });

  const msg = completion.choices[0]?.message;
  const calls = msg?.tool_calls || [];

  if (calls.length === 0) {
    const text = (msg?.content || '').trim();
    return text.toUpperCase().startsWith('UNSUPPORTED:') 
      ? fallback(text.split(/:(.*)/s)[1].trim())
      : fallback(text || "Cannot map query to a supported operation.");
  }

  const call = calls[0];
  const name = call.function.name;
  let args: any;
  
  try {
    args = JSON.parse(call.function.arguments || '{}');
  } catch {
    return fallback(`invalid arguments: ${call.function.arguments}`);
  }

  const cleanArgs = Object.fromEntries(Object.entries(args).filter(([_, v]) => v !== null));

  try {
    if (name === 'query_metric') {
      const input = QueryMetricInputSchema.parse(cleanArgs);
      const res = await runQueryMetric(input);
      const summary = `metric: ${input.metric}, fields: ${input.fields || 'none'}, rows: ${JSON.stringify(res.rows.slice(0, 20))}`;
      const answer = await summarize(question, name, summary);
      return { kind: 'query', answer, result: res };
    }

    if (name === 'forecast') {
      const input = ForecastInputSchema.parse(cleanArgs);
      const res = await runForecast({
        grain: input.grain as 'product_category',
        entity: input.entity,
        horizon_months: input.horizon_months,
        method: input.method
      });
      const summary = `category: ${input.entity}, horizon: ${input.horizon_months}, recommendation: ${res.inventory_recommendation}, points: ${JSON.stringify(res.forecast)}`;
      const answer = await summarize(question, name, summary);
      return { kind: 'forecast', answer, result: res };
    }

    return fallback(`Unknown tool: '${name}'.`);
  } catch (err: any) {
    return fallback(err.errors ? `Validation failed: ${err.errors[0]?.message}` : err.message || 'Analysis error.');
  }
}

async function summarize(question: string, tool: string, summary: string): Promise<string> {
  const openai = getLLMClient();
  const completion = await openai.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      {
        role: 'system',
        content: `Summarize the tool results in 1-2 short sentences. State numbers exactly as returned. Do not invent values or speculate. Do not use emoji or ASCII-tables, use basic sentences.`
      },
      {
        role: 'user',
        content: `Question: ${question}\nTool: ${tool}\nResult:\n${summary}`
      }
    ],
    temperature: 0.1,
    max_tokens: 200
  });
  return (completion.choices[0]?.message?.content || '').trim();
}