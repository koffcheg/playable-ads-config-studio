import type { GeneratePlayableAdInput } from "@studio/shared";

export interface LlmProvider {
  name: string;
  model?: string;
  generatePlayableAdConfig(input: GeneratePlayableAdInput): Promise<unknown>;
}
