# AI Analytics

Logistics analytics dashboard. Users can ask questions or browse the dashboard. Backend executes the SQL, the AI layer picks the tool, and the frontend renders the chart.

---

## Features

### 1. Natural language querying over logistics data

The `/ask` page accepts a text question. The backend sends it to the LLM with a system prompt that describes exactly what metrics, fields, filters, and time grains exist. The LLM decides whether to call `query_metric` (descriptive analytics) or `forecast` (demand prediction). It does not generate new SQL.

Two tool definitions are registered:

- `query_metric`
- `forecast`

If the question cannot be answered with either tool (e.g. comparing two time periods, or asking for SKU-level forecasts), the LLM responds with `UNSUPPORTED:` and the frontend shows a clear error card with what is supported.

### 2. Tool selection by the LLM

The LLM is given the full registry of metrics, fields, and constraints in the system prompt via `getRegistrySummaryForPrompt()`. It picks a tool at `temperature: 0.1` low temperature means it stays predictable. The first tool call is extracted. Arguments are passed through Zod schema validation before any query runs. Bad arguments surface as a clean error, not a crash.

### 3. Summarization

After the tool runs, a second LLM call summarizes the result in 1–2 sentences. It gets the raw numbers and is told: state exact values, no emoji, no ASCII formatting.

### 4. Visualization

The query tool returns a `viz_spec` alongside the rows — `type` (`line`, `bar`, or `number`), `x`, `y`, and `y_unit`. The frontend reads that spec and renders the Recharts component. No chart-type logic lives in the frontend. The backend says what to draw; the frontend draws it.

For forecasts, historical monthly data and predicted months are rendered together on a single chart so users can see where real data ends and prediction begins.

The dashboard (`/dashboard`) has hardcoded charts: order volume over time, delivery status breakdown, and carrier delay rates.

---

## Data flow

```
User types question
       │
       ▼
POST /api/ask
       │
       ▼
LLM call #1 — tool selection
  System prompt includes full metric/field registry
  temperature: 0.1, tool_choice: auto
       │
       ├─ No tool call → UNSUPPORTED response
       │
       └─ Tool call selected
              │
              ├─ query_metric
              │     Zod validates args
              │     SQL built from metric registry (no raw SQL from LLM)
              │     DuckDB executes against CSV view
              │     Returns rows + viz_spec
              │
              └─ forecast
                    Zod validates args
                    Loads 12-month series from DuckDB
                    Routes to Holt-Winters / linear trend / moving average
                    Returns historical + forecast points + inventory recommendation
              │
              ▼
       LLM call #2 — summarization
         Raw result passed in, told to state numbers exactly
         Returns 1–2 sentence plain-text answer
              │
              ▼
       JSON response: { kind, answer, result }
              │
              ▼
       Frontend renders answer card + chart or forecast view
```

---

## Technical decisions

### DuckDB instead of PostgreSQL

Data lives in a CSV file. DuckDB reads it directly as a view without import step, schema migration, and running database process. It runs in-memory, and `read_csv_auto` handles type inference.

The `docker-compose.yml` already includes a PostgreSQL service for when this needs to go to production. The connection string is wired up in the environment. Switching from DuckDB to Postgres is a one-file change in `repository/duckdb.ts`.

### Zod for schema validation

The LLM can hallucinate parameters. Zod catches it before anything touches the database. Every tool argument: metric name, field, time grain, date format, horizon length, is validated with a typed schema. If it fails, the user gets a clean unsupported message, not a SQL error.

### Holt-Winters, Linear Trend and Moving Average for forecasting

Forecasting uses one of three methods depending on how much data is available:

- **Holt-Winters additive exponential smoothing** — used when all 12 months of history are available. This is the default for monthly logistics data because it models level, trend, and seasonality. It handles months that are consistently busier than others (e.g. end-of-year spikes).
- **Linear trend** — fallback when 6–11 months exist. Fits a straight line through the history and projects forward. R² is included in the methodology output.
- **Moving average** — last resort for fewer than 6 months. Takes the mean of the last 3 months and projects flat.

The method used, the parameters, and methodology note all come back in the response. Inventory recommendation is `ceil(sum(forecast) × 1.10)` — a 10% unit buffer, configurable via `BUFFER` in the environment.

### Dockerization

The backend has a working `Dockerfile` (multi-stage build, Node 20 Alpine) and `docker-compose.yml`. To run in production:

```bash
cd backend
docker compose up --build
```

The compose file exposes port `8080` and includes environment variable passthrough. The Postgres service is already wired but dormant — it's there for the production migration, not the MVP.

---

## Assumptions and limitations

**Data**
- Dataset is static: `data/mock_logistics_data.csv`, covering 2025-01-01 to 2025-12-30. No live ingestion.
- DuckDB runs in-memory. Data is re-read from CSV on every server start. No persistence between restarts beyond the file itself.
- The date "today" is hardcoded in the system prompt as `2026-05-05` so the LLM resolves relative terms like "last month" consistently against the dataset window.

**Querying**
- One tool call per question. Multi-step or chained queries (e.g. "show me delayed orders, then compare to last quarter") are not supported.
- Only one dimension (`fields`) can be grouped at a time. Cross-dimensional breakdowns (e.g. carrier by region) are not supported.
- Filters support `eq` and `in` operators only. Range filters on non-date fields are not supported.
- All queries run against the full 2025 dataset unless `date_from` / `date_to` are specified.

**Forecasting**
- Forecasting is only available at `product_category` grain. SKU-level forecasting is not supported.
- Horizon is capped at 6 months.
- Holt-Winters parameters (α, β, γ) are fixed defaults. No hyperparameter tuning per category.
- The 10% inventory buffer (`BUFFER`) is a flat multiplier applied to the sum of the forecast. It does not account for lead time, reorder points, or category-specific demand variability.

**Auth**
- Bearer token auth is a static string from environment. It is not user-specific and does not expire.

---

## Unsupported queries

The LLM is instructed to return `UNSUPPORTED:` for any of the following. The frontend surfaces these as an error card with the list of supported metrics and fields.

- Comparisons across two time periods (e.g. "Q1 vs Q3 delay rate")
- Multi-step or chained questions (e.g. "which carrier has the most delays, and how does that compare to their volume?")
- Forecast horizon beyond 6 months
- SKU-level forecasting (only `product_category` grain is supported)
- Questions outside the data window (pre-2025 or post-2025-12-30)
- Metrics or dimensions not in the registry (e.g. revenue, profit, customer name)

---

## Future improvements

- **Multi-step queries** — add an orchestration layer that can chain tool calls (e.g. filter first, then compare across groups).
- **PostgreSQL migration** — the Postgres service is already in `docker-compose.yml`. Next step is a schema migration and swapping the DuckDB adapter.
- **Live data ingestion** — replace the static CSV with a streaming or scheduled ingest pipeline so the dataset stays current.
- **Holt-Winters tuning** — fit α, β, γ per category using historical error minimization rather than fixed defaults.
- **More metrics** — revenue, order value, promo impact, and warehouse throughput are all in the dataset but not registered as metrics.
- **Multi-field grouping** — allow grouping by two dimensions at once (e.g. carrier × region).
- **Token-based auth** — replace the static bearer token with short-lived JWT or per-user tokens.
- **Conversation memory** — the `/ask` page keeps a local history list but each question is independent. Stateful follow-up questions ("and what about last month?") are not supported.

---

## Stack

**Backend** — Node.js, Express 5, TypeScript, DuckDB, Zod, OpenAI SDK (OpenRouter-compatible)

**Frontend** — Next.js 16 (App Router), React 19, Tailwind CSS 4, Recharts

---

## Setup

### Backend

```bash
cd backend
cp .env.example .env
# Fill in API_KEY (your OpenRouter or Anthropic key)
npm install
npm run dev
```

The server starts on port `8080` by default. Data file is expected at `data/mock_logistics_data.csv`.

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8080
npm install
npm run dev
```

Opens on `http://localhost:3000`.

### Environment variables (backend)

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `8080` | Backend port |
| `API_KEY` | — | LLM API key (required) |
| `LLM_MODEL` | `anthropic/claude-sonnet-4.6` | Any OpenRouter-compatible model |
| `LLM_BASE_URL` | `https://openrouter.ai/api/v1` | OpenAI SDK |
| `BUFFER` | `0.10` | Buffer unit for inventory recommendation |
| `API_AUTH_TOKEN` | `example-auth-token-2026` | Bearer token for all API calls |
| `ALLOW_CORS` | `http://localhost:3000` | Frontend origin |

---

## Running tests

```bash
cd backend
npm test
```

Vitest covers the forecasting functions (`forecast.test.ts`) — Holt-Winters, linear trend, moving average, and the auto-routing logic.