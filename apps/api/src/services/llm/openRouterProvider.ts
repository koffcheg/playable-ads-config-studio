import {
  AgentConceptSchema,
  type AgentBriefInput,
  type AgentConcept,
  type GeneratePlayableAdInput
} from "@studio/shared";
import type { LlmProvider } from "./provider.js";
import { ExternalServiceError } from "../../utils/errors.js";

interface OpenRouterProviderOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
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
    "You are generating data for backend schema validation.",
    "Return exactly one JSON object and nothing else.",
    "Do not include markdown, code fences, explanations, comments, prefixes, or suffixes.",
    "Use EXACT field names only: gameType, theme, headline, ctaText, objective, difficultyScore, tutorialSteps, failText, winText, palette.",
    "Constraints:",
    "- difficultyScore must be an integer from 1 to 5.",
    "- tutorialSteps must be an array of 2 to 5 short strings.",
    "- palette must be an object with background and accent.",
    "- palette.background and palette.accent must be valid #RRGGBB strings (uppercase or lowercase hex).",
    "- Keep strings concise, ad-ready, and aligned to the provided input.",
    "- Do not add any extra fields.",
    `Input: ${JSON.stringify(input)}`
  ].join("\n");
}

function buildConceptPrompt(input: AgentBriefInput): string {
  return [
    "You are generating an ad concept for backend schema validation.",
    "Return exactly one JSON object and nothing else.",
    "Do not include markdown, code fences, explanations, comments, prefixes, or suffixes.",
    "Use EXACT field names only: recommendedGameType, headlineIdea, ctaDirection, gameplayConcept, recommendedDifficulty.",
    "Constraints:",
    "- recommendedGameType must be one of: runner, merge, tap-survival.",
    "- recommendedDifficulty must be one of: easy, medium, hard.",
    "- Keep each string concise and actionable for ad generation.",
    "- Do not add any extra fields.",
    `Brief: ${JSON.stringify(input)}`
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
  const trimmed = normalizeModelText(content);

  if (!trimmed) {
    throw new ExternalServiceError("OpenRouter returned an empty response");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const extracted = extractFirstJsonObject(trimmed);
    if (extracted) {
      try {
        return JSON.parse(extracted);
      } catch {
        // Fall through to final error below.
      }
    }
    console.warn("[llm] invalid JSON from provider=openrouter", {
      sample: truncateForLog(trimmed)
    });
    throw new ExternalServiceError("OpenRouter returned invalid JSON");
  }
}

function normalizeModelText(content: string): string {
  const trimmed = content.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fencedMatch?.[1] ?? trimmed).trim();
}

function extractFirstJsonObject(value: string): string | null {
  const startIndex = value.indexOf("{");
  const endIndex = value.lastIndexOf("}");

  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    return null;
  }

  return value.slice(startIndex, endIndex + 1);
}

function truncateForLog(value: string, maxLength = 600): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}…[truncated ${value.length - maxLength} chars]`;
}

export class OpenRouterProvider implements LlmProvider {
  name = "openrouter";
  readonly model: string;

  constructor(private readonly options: OpenRouterProviderOptions) {
    this.model = options.model;
  }

  async generateAgentConcept(input: AgentBriefInput): Promise<AgentConcept> {
    const raw = await this.requestModel(buildConceptPrompt(input));
    const parsedConcept = AgentConceptSchema.safeParse(raw);

    if (!parsedConcept.success) {
      throw new ExternalServiceError("OpenRouter returned invalid concept JSON", {
        issues: parsedConcept.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    return parsedConcept.data;
  }

  async generatePlayableAdConfig(input: GeneratePlayableAdInput): Promise<unknown> {
    return this.requestModel(buildPrompt(input));
  }

  private async requestModel(prompt: string): Promise<unknown> {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), this.options.timeoutMs);

    let response: Response;

    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
                "You generate playable ad configurations as strict machine-parseable JSON objects."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.1
        }),
        signal: timeoutController.signal
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.warn(
          `[llm] provider request timeout provider=openrouter model=${this.options.model} timeoutMs=${this.options.timeoutMs}`
        );
        throw new ExternalServiceError("OpenRouter request timed out", {
          timeoutMs: this.options.timeoutMs
        });
      }

      throw new ExternalServiceError("OpenRouter request failed", error);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ExternalServiceError("OpenRouter request failed", {
        provider: "openrouter",
        model: this.options.model,
        status: response.status,
        body: truncateForLog(errorBody, 1200)
      });
    }

    const data = (await response.json()) as OpenRouterResponse;
    const content = readMessageContent(data.choices?.[0]?.message?.content);

    return parseModelOutput(content);
  }
}
