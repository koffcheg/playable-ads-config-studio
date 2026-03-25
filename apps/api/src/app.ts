import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { playableAdsRoutes } from "./routes/playableAds.js";
import { AppError } from "./utils/errors.js";
import { buildErrorResponse } from "./utils/http.js";

export function buildApp() {
  const usePrettyLogger = process.env.LOG_PRETTY === "true";

  const app = Fastify({
    logger: usePrettyLogger
      ? {
          transport: {
            target: "pino-pretty"
          }
        }
      : true
  });

  app.register(cors, {
    origin: "http://localhost:3000"
  });

  app.get("/health", async () => ({ status: "ok" }));

  app.register(playableAdsRoutes);

  app.setNotFoundHandler((request, reply) => {
    return reply.code(404).send(
      buildErrorResponse("NOT_FOUND", `Route '${request.method} ${request.url}' not found`)
    );
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(
      {
        err: error,
        method: request.method,
        url: request.url
      },
      "Unhandled request error"
    );

    if (error instanceof AppError) {
      return reply
        .code(error.statusCode)
        .send(buildErrorResponse(error.code, error.message, error.details));
    }

    if (error instanceof ZodError) {
      return reply.code(400).send(
        buildErrorResponse(
          "VALIDATION_ERROR",
          "Validation failed",
          error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        )
      );
    }

    return reply
      .code(500)
      .send(buildErrorResponse("INTERNAL_SERVER_ERROR", "Something went wrong"));
  });

  return app;
}
