import type { AgentBriefInput, AgentConcept, GeneratePlayableAdInput } from "@studio/shared";

export interface LlmProvider {
  name: string;
  model?: string;
  generateAgentConcept(input: AgentBriefInput): Promise<AgentConcept>;
  generatePlayableAdConfig(input: GeneratePlayableAdInput): Promise<unknown>;
}
