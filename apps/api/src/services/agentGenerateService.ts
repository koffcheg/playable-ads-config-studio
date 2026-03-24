import crypto from "node:crypto";
import { ZodError } from "zod";
import {
  AgentBriefInputSchema,
  AgentConceptSchema,
  type AgentBriefInput,
  type AgentConcept,
  type AgentGenerateResponse,
  type AgentRunStep,
  GeneratePlayableAdInputSchema,
  PlayableAdConfigSchema,
  type GeneratePlayableAdInput,
  type PlayableAdConfig
} from "@studio/shared";
import { getPlayableAdsCollection } from "../db/mongo.js";
import { getProvider } from "./llm/getProvider.js";
import { DatabaseError, ExternalServiceError, ValidationError } from "../utils/errors.js";

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
}

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

function conceptToConfigInput(brief: AgentBriefInput, conceptRaw: unknown): GeneratePlayableAdInput {
  const concept = AgentConceptSchema.parse(conceptRaw);

  return GeneratePlayableAdInputSchema.parse({
    gameType: concept.recommendedGameType,
    theme: brief.theme,
    targetAudience: brief.targetAudience,
    ctaStyle: concept.ctaDirection.toLowerCase().includes("reward")
      ? "reward"
      : concept.ctaDirection.toLowerCase().includes("challenge")
        ? "challenge"
        : "urgent",
    difficulty: concept.recommendedDifficulty
  });
}

export async function agentGeneratePlayableAdConfig(rawInput: unknown): Promise<AgentGenerateResponse> {
  const steps: AgentRunStep[] = [];
  let brief: AgentBriefInput;

  try {
    brief = AgentBriefInputSchema.parse(rawInput);
    steps.push({
      name: "validate-brief",
      status: "success",
      message: "Brief input validated"
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Invalid agent brief input", formatZodError(error));
    }

    throw new ValidationError("Invalid agent brief input");
  }

  const llmProvider = getProvider();

  let concept: AgentConcept;
  try {
    concept = await llmProvider.generateAgentConcept(brief);
    steps.push({
      name: "generate-concept",
      status: "success",
      message: "Concept generated successfully"
    });
  } catch (error) {
    throw new ExternalServiceError("Failed to generate concept", error);
  }

  let configInput: GeneratePlayableAdInput;
  try {
    configInput = conceptToConfigInput(brief, concept);
    steps.push({
      name: "map-concept-to-config-input",
      status: "success",
      message: "Concept mapped to config input"
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError("Generated concept is invalid", formatZodError(error));
    }

    throw new ValidationError("Generated concept is invalid");
  }

  let rawModelOutput: unknown;
  try {
    rawModelOutput = await llmProvider.generatePlayableAdConfig(configInput);
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error;
    }

    throw new ExternalServiceError("LLM provider failed to generate config", error);
  }

  const parsedOutput = PlayableAdConfigSchema.omit({
    id: true,
    status: true,
    createdAt: true
  }).safeParse(rawModelOutput);

  const output: PlayableAdConfig = parsedOutput.success
    ? {
        id: crypto.randomUUID(),
        ...parsedOutput.data,
        status: "success",
        createdAt: new Date().toISOString()
      }
    : buildFallbackConfig(configInput);

  steps.push({
    name: "validate-config",
    status: output.status,
    message:
      output.status === "success"
        ? "Generated config validated successfully"
        : "Generated config invalid, fallback used"
  });

  try {
    const collection = await getPlayableAdsCollection();
    await collection.insertOne({
      mode: "agent",
      brief,
      concept,
      input: configInput,
      steps,
      output,
      provider: llmProvider.name,
      createdAt: output.createdAt
    });
  } catch (error) {
    throw new DatabaseError("Failed to persist agent playable ad generation", error);
  }

  return {
    concept,
    steps,
    output
  };
}
