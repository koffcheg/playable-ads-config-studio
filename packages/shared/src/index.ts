import { z } from "zod";

export const GameTypeSchema = z.enum(["runner", "merge", "tap-survival"]);
export const TargetAudienceSchema = z.enum(["casual", "midcore"]);
export const CtaStyleSchema = z.enum(["urgent", "reward", "challenge"]);
export const DifficultySchema = z.enum(["easy", "medium", "hard"]);
export const GenerationStatusSchema = z.enum(["success", "fallback"]);

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
  createdAt: z.string()
});

export type GeneratePlayableAdInput = z.infer<typeof GeneratePlayableAdInputSchema>;
export type PlayableAdConfig = z.infer<typeof PlayableAdConfigSchema>;
export type PlayableAdHistoryListItem = z.infer<typeof PlayableAdHistoryListItemSchema>;
export type GameType = z.infer<typeof GameTypeSchema>;
export type Difficulty = z.infer<typeof DifficultySchema>;
