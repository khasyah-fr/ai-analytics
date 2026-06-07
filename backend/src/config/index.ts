import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

export const DATA_CSV_PATH = process.env.DATA_CSV_PATH || path.join(ROOT, 'data', 'mock_logistics_data.csv');

export const API_KEY = process.env.API_KEY || '';
export const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1';
export const LLM_MODEL = process.env.LLM_MODEL || 'anthropic/claude-3.5-sonnet';

export const PORT = parseInt(process.env.PORT || '3000', 10);
export const ALLOW_CORS = (process.env.ALLOW_CORS || 'http://localhost:3000')

export const BUFFER = parseFloat(process.env.BUFFER || '0.20');

export const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN || 'example-auth-token-2026';