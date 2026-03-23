import type { GeneratePlayableAdInput } from "@studio/shared";

export interface LlmProvider {
  name: string;
  generatePlayableAdConfig(input: GeneratePlayableAdInput): Promise<unknown>;
}
