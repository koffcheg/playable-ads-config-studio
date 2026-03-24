import type { GeneratePlayableAdInput } from "@studio/shared";
import type { LlmProvider } from "./provider.js";
import { ExternalServiceError } from "../../utils/errors.js";

interface OpenRouterProviderOptions {
  apiKey: string;
  model: string;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

function buildPrompt(input: GeneratePlayableAdInput): string {
  return [
    "Generate a playable ad config as JSON for this input.",
    "Return JSON only, with no markdown.",
    "Required fields: gameType, theme, headline, ctaText, objective, difficultyScore, tutorialSteps, failText, winText, palette.",
    "Palette must include background and accent as hex colors.",
    `Input: ${JSON.stringify(input)}`
  ].join("\n");
}

type MessageContent = string | Array<{ type?: string; text?: string }> | undefined;

function readMessageContent(content: MessageContent): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((item) => item.type === "text" && typeof item.text === "string")
      .map((item) => item.text)
      .join("\n");
  }

  return "";
}

function parseModelOutput(content: string): unknown {
  const trimmed = content.trim();

  if (!trimmed) {
    throw new ExternalServiceError("OpenRouter returned an empty response");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    throw new ExternalServiceError("OpenRouter returned invalid JSON");
  }
}

export class OpenRouterProvider implements LlmProvider {
  name = "openrouter";

  constructor(private readonly options: OpenRouterProviderOptions) {}

  async generatePlayableAdConfig(input: GeneratePlayableAdInput): Promise<unknown> {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.options.model,
        messages: [
          {
            role: "system",
            content:
              "You generate playable ad configurations as strict JSON objects suitable for schema validation."
          },
          {
            role: "user",
            content: buildPrompt(input)
          }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ExternalServiceError("OpenRouter request failed", {
        status: response.status,
        body: errorBody
      });
    }

    const data = (await response.json()) as OpenRouterResponse;
    const content = readMessageContent(data.choices?.[0]?.message?.content);

    return parseModelOutput(content);
  }
}
