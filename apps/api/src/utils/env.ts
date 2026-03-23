import dotenv from "dotenv";

dotenv.config();

function getNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: getNumber(process.env.PORT, 8080),
  HOST: process.env.HOST ?? "0.0.0.0",
  MONGO_URL: process.env.MONGO_URL ?? "mongodb://localhost:27017",
  MONGO_DB_NAME: process.env.MONGO_DB_NAME ?? "playable_ads_studio",
  LLM_PROVIDER: process.env.LLM_PROVIDER ?? "mock",
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? "",
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL ?? ""
};
