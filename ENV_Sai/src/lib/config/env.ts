/**
 * Environment variable configuration with runtime validation
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const env = {
  // App
  nodeEnv: optionalEnv("NODE_ENV", "development"),
  appUrl: optionalEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

  // Database
  get databaseUrl() {
    return requireEnv("DATABASE_URL");
  },

  // Auth
  get jwtSecret() {
    return requireEnv("JWT_SECRET");
  },
  get jwtRefreshSecret() {
    return requireEnv("JWT_REFRESH_SECRET");
  },

  // AI
  get openaiApiKey() {
    return requireEnv("OPENAI_API_KEY");
  },
  openaiModel: optionalEnv("OPENAI_MODEL", "gpt-4o"),
  openaiBaseUrl: optionalEnv("OPENAI_BASE_URL", "https://api.openai.com/v1"),

  // Redis
  redisUrl: process.env.REDIS_URL || null,

  // Rate limiting
  rateLimitAiMax: parseInt(optionalEnv("RATE_LIMIT_AI_MAX", "20"), 10),
  rateLimitAiWindowMs: parseInt(optionalEnv("RATE_LIMIT_AI_WINDOW_MS", "60000"), 10),

  // CSRF
  csrfSecret: optionalEnv("CSRF_SECRET", "dev-csrf-secret-change-me"),
} as const;
