import type { AgentBriefInput, AgentConcept, GeneratePlayableAdInput } from "@studio/shared";
import type { LlmProvider } from "./provider.js";

function mapDifficultyToScore(difficulty: GeneratePlayableAdInput["difficulty"]): number {
  switch (difficulty) {
    case "easy":
      return 2;
    case "medium":
      return 3;
    case "hard":
      return 4;
    default:
      return 3;
  }
}

function paletteByTheme(theme: string) {
  const lower = theme.toLowerCase();

  if (lower.includes("space")) {
    return { background: "#0b1020", accent: "#60a5fa" };
  }

  if (lower.includes("crystal")) {
    return { background: "#102a43", accent: "#2dd4bf" };
  }

  if (lower.includes("robot")) {
    return { background: "#111827", accent: "#f59e0b" };
  }

  return { background: "#0f172a", accent: "#38bdf8" };
}

function headlineByTheme(theme: string, gameType: GeneratePlayableAdInput["gameType"]) {
  const lower = theme.toLowerCase();

  if (lower.includes("space")) {
    return gameType === "runner"
      ? "Race through the stars!"
      : "Explore the galaxy now!";
  }

  if (lower.includes("crystal")) {
    return "Match crystals to unlock the cave!";
  }

  if (lower.includes("robot")) {
    return "Defend the factory core!";
  }

  return `Play the ${theme} challenge now!`;
}

function objectiveByGameType(gameType: GeneratePlayableAdInput["gameType"], theme: string) {
  switch (gameType) {
    case "runner":
      return `Dash through ${theme} and avoid obstacles`;
    case "merge":
      return `Combine items in ${theme} to unlock rewards`;
    case "tap-survival":
      return `Tap fast to survive the ${theme} scenario`;
  }
}

function tutorialByGameType(gameType: GeneratePlayableAdInput["gameType"]) {
  switch (gameType) {
    case "runner":
      return ["Tap to boost", "Avoid obstacles", "Reach the finish"];
    case "merge":
      return ["Drag matching items", "Create bigger combinations", "Reach the target"];
    case "tap-survival":
      return ["Tap to defend", "Keep your energy up", "Survive the wave"];
  }
}

export class MockLlmProvider implements LlmProvider {
  name = "mock-llm";

  async generateAgentConcept(input: AgentBriefInput): Promise<AgentConcept> {
    const recommendedGameType: AgentConcept["recommendedGameType"] = input.campaignGoal
      .toLowerCase()
      .includes("retention")
      ? "tap-survival"
      : input.theme.toLowerCase().includes("merge")
        ? "merge"
        : "runner";

    const recommendedDifficulty: AgentConcept["recommendedDifficulty"] =
      input.targetAudience === "midcore" ? "medium" : "easy";

    return {
      recommendedGameType,
      headlineIdea: `${input.theme} ${input.tone} challenge`,
      ctaDirection: `Push ${input.campaignGoal} with a ${input.tone} CTA`,
      gameplayConcept: `Build a ${recommendedGameType} moment around ${input.theme} for ${input.targetAudience} players`,
      recommendedDifficulty
    };
  }

  async generatePlayableAdConfig(input: GeneratePlayableAdInput): Promise<unknown> {
    const palette = paletteByTheme(input.theme);

    return {
      gameType: input.gameType,
      theme: input.theme,
      headline: headlineByTheme(input.theme, input.gameType),
      ctaText:
        input.ctaStyle === "urgent"
          ? "Play now"
          : input.ctaStyle === "reward"
            ? "Unlock rewards"
            : "Take the challenge",
      objective: objectiveByGameType(input.gameType, input.theme),
      difficultyScore: mapDifficultyToScore(input.difficulty),
      tutorialSteps: tutorialByGameType(input.gameType),
      failText: "Try again!",
      winText: "Great job!",
      palette
    };
  }
}
