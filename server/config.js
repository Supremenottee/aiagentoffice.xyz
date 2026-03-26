import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-3.5-turbo',
  },
  security: {
    maxTaskLength: parseInt(process.env.MAX_TASK_LENGTH || '2000'),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '20'),
  },
};
