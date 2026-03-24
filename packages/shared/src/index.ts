import { z } from "zod";

export const GameTypeSchema = z.enum(["runner", "merge", "tap-survival"]);
export const TargetAudienceSchema = z.enum(["casual", "midcore"]);
export const CtaStyleSchema = z.enum(["urgent", "reward", "challenge"]);
export const DifficultySchema = z.enum(["easy", "medium", "hard"]);
export const GenerationStatusSchema = z.enum(["success", "fallback"]);
export const GenerationModeSchema = z.enum(["manual", "agent"]);

export const GeneratePlayableAdInputSchema = z.object({
  gameType: GameTypeSchema,
  theme: z.string().min(2).max(50),
  targetAudience: TargetAudienceSchema,
  ctaStyle: CtaStyleSchema,
  difficulty: DifficultySchema
});

export const PaletteSchema = z.object({
  background: z.string().min(1),
  accent: z.string().min(1)
});

export const PlayableAdConfigSchema = z.object({
  id: z.string(),
  gameType: GameTypeSchema,
  theme: z.string(),
  headline: z.string(),
  ctaText: z.string(),
  objective: z.string(),
  difficultyScore: z.number().int().min(1).max(5),
  tutorialSteps: z.array(z.string()).min(1).max(5),
  failText: z.string(),
  winText: z.string(),
  palette: PaletteSchema,
  status: GenerationStatusSchema,
  createdAt: z.string()
});

export const PlayableAdHistoryListItemSchema = z.object({
  id: z.string(),
  theme: z.string(),
  gameType: GameTypeSchema,
  provider: z.string(),
  status: GenerationStatusSchema,
  mode: GenerationModeSchema,
  createdAt: z.string()
});

export const AgentBriefInputSchema = z.object({
  theme: z.string().min(2).max(50),
  targetAudience: TargetAudienceSchema,
  campaignGoal: z.string().min(2).max(80),
  tone: z.string().min(2).max(40)
});

export const AgentConceptSchema = z.object({
  recommendedGameType: GameTypeSchema,
  headlineIdea: z.string().min(3).max(120),
  ctaDirection: z.string().min(2).max(80),
  gameplayConcept: z.string().min(5).max(160),
  recommendedDifficulty: DifficultySchema
});

export const AgentRunStepSchema = z.object({
  name: z.string(),
  status: z.enum(["success", "fallback"]),
  message: z.string()
});

export const AgentGenerateResponseSchema = z.object({
  concept: AgentConceptSchema,
  steps: z.array(AgentRunStepSchema).min(3),
  output: PlayableAdConfigSchema
});

export type GeneratePlayableAdInput = z.infer<typeof GeneratePlayableAdInputSchema>;
export type PlayableAdConfig = z.infer<typeof PlayableAdConfigSchema>;
export type PlayableAdHistoryListItem = z.infer<typeof PlayableAdHistoryListItemSchema>;
export type AgentBriefInput = z.infer<typeof AgentBriefInputSchema>;
export type AgentConcept = z.infer<typeof AgentConceptSchema>;
export type AgentRunStep = z.infer<typeof AgentRunStepSchema>;
export type AgentGenerateResponse = z.infer<typeof AgentGenerateResponseSchema>;
export type GameType = z.infer<typeof GameTypeSchema>;
export type Difficulty = z.infer<typeof DifficultySchema>;
