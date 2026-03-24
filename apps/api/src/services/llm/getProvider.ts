import { env } from "../../utils/env.js";
import { ConfigurationError } from "../../utils/errors.js";
import { MockLlmProvider } from "./mockProvider.js";
import { OpenRouterProvider } from "./openRouterProvider.js";
import type { LlmProvider } from "./provider.js";

const SUPPORTED_PROVIDERS = ["mock", "openrouter"] as const;

type ProviderName = (typeof SUPPORTED_PROVIDERS)[number];

function resolveProviderName(rawProvider: string): ProviderName {
  const normalized = rawProvider.toLowerCase();

  if (SUPPORTED_PROVIDERS.includes(normalized as ProviderName)) {
    return normalized as ProviderName;
  }

  return "mock";
}

function createOpenRouterProvider(): OpenRouterProvider {
  if (!env.OPENROUTER_API_KEY) {
    throw new ConfigurationError(
      "OPENROUTER_API_KEY is required when LLM_PROVIDER is openrouter"
    );
  }

  if (!env.OPENROUTER_MODEL) {
    throw new ConfigurationError(
      "OPENROUTER_MODEL is required when LLM_PROVIDER is openrouter"
    );
  }

  return new OpenRouterProvider({
    apiKey: env.OPENROUTER_API_KEY,
    model: env.OPENROUTER_MODEL,
    timeoutMs: env.OPENROUTER_TIMEOUT_MS
  });
}

export function getProvider(): LlmProvider {
  const providerName = resolveProviderName(env.LLM_PROVIDER);

  switch (providerName) {
    case "openrouter": {
      const provider = createOpenRouterProvider();
      console.info(`[llm] selected provider=${provider.name} model=${provider.model}`);
      return provider;
    }
    case "mock":
    default:
      console.info("[llm] selected provider=mock");
      return new MockLlmProvider();
  }
}
