import type { FastifyInstance } from "fastify";
import { agentGeneratePlayableAdConfig } from "../services/agentGenerateService.js";
import { generatePlayableAdConfig } from "../services/generateConfigService.js";
import { getHistory, getHistoryById } from "../services/historyService.js";

export async function playableAdsRoutes(app: FastifyInstance) {
  app.post("/api/v1/playable-ads/generate-config", async (request, reply) => {
    const result = await generatePlayableAdConfig(request.body);
    return reply.code(201).send(result);
  });

  app.post("/api/v1/playable-ads/agent-generate", async (request, reply) => {
    const result = await agentGeneratePlayableAdConfig(request.body);
    return reply.code(201).send(result);
  });

  app.get("/api/v1/playable-ads", async () => {
    return getHistory();
  });

  app.get("/api/v1/playable-ads/:id", async (request) => {
    const params = request.params as { id: string };
    return getHistoryById(params.id);
  });
}
