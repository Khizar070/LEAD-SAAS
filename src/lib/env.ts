import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection string"),
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["resend", "sendgrid", "mock"]).optional().default("resend"),
  EMAIL_FROM: z.string().optional().default("Lead SaaS <onboarding@resend.dev>"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

function getEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format());
    throw new Error("Invalid environment variables");
  }

  return result.data;
}

export const env = getEnv();
