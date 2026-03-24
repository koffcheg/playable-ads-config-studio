import crypto from "node:crypto";
import { ZodError, type ZodIssue } from "zod";
import {
  GeneratePlayableAdInputSchema,
  PlayableAdConfigSchema,
  type GeneratePlayableAdInput,
  type PlayableAdConfig
} from "@studio/shared";
import { getPlayableAdsCollection } from "../db/mongo.js";
import { getProvider } from "./llm/getProvider.js";
import {
  DatabaseError,
  ExternalServiceError,
  ValidationError
} from "../utils/errors.js";


function buildFallbackConfig(input: GeneratePlayableAdInput): PlayableAdConfig {
  const difficultyScore =
    input.difficulty === "easy" ? 2 : input.difficulty === "medium" ? 3 : 4;

  return {
    id: crypto.randomUUID(),
    gameType: input.gameType,
    theme: input.theme,
    headline: `${input.theme} challenge`,
    ctaText: "Play now",
    objective: `Try this ${input.gameType} ad`,
    difficultyScore,
    tutorialSteps: ["Tap to start", "Follow the hints"],
    failText: "Try again!",
    winText: "You win!",
    palette: {
      background: "#111827",
      accent: "#22c55e"
    },
    status: "fallback",
    createdAt: new Date().toISOString()
  };
}

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}

function toSafeLogValue(value: unknown, maxLength = 800): string {
  let serialized: string;

  try {
    serialized = typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    serialized = String(value);
  }

  if (serialized.length <= maxLength) {
    return serialized;
  }

  return `${serialized.slice(0, maxLength)}…[truncated ${serialized.length - maxLength} chars]`;
}

export async function generatePlayableAdConfig(rawInput: unknown): Promise<PlayableAdConfig> {
  let input: GeneratePlayableAdInput;

  try {
    input = GeneratePlayableAdInputSchema.parse(rawInput);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Invalid playable ad generation input", formatZodError(error));
    }

    throw new ValidationError("Invalid playable ad generation input");
  }

  const llmProvider = getProvider();

  let rawModelOutput: unknown;

  try {
    rawModelOutput = await llmProvider.generatePlayableAdConfig(input);
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error;
    }

    throw new ExternalServiceError("LLM provider failed to generate config", error);
  }

  const parsed = PlayableAdConfigSchema.omit({
    id: true,
    status: true,
    createdAt: true
  }).safeParse(rawModelOutput);

  if (!parsed.success) {
    console.warn("[llm] schema validation failure: using fallback config", {
      provider: llmProvider.name,
      model: llmProvider.model ?? "n/a",
      issues: parsed.error.issues.map((issue: ZodIssue) => ({
        path: issue.path.join("."),
        message: issue.message
      })),
      rawOutput: toSafeLogValue(rawModelOutput)
    });
  }

  const finalConfig: PlayableAdConfig = parsed.success
    ? {
        id: crypto.randomUUID(),
        ...parsed.data,
        status: "success",
        createdAt: new Date().toISOString()
      }
    : buildFallbackConfig(input);

  try {
    const collection = await getPlayableAdsCollection();
    await collection.insertOne({
      input,
      output: finalConfig,
      provider: llmProvider.name,
      createdAt: finalConfig.createdAt
    });
  } catch (error) {
    throw new DatabaseError("Failed to persist playable ad generation", error);
  }

  return finalConfig;
}
