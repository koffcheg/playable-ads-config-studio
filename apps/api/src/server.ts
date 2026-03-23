import { buildApp } from "./app.js";
import { env } from "./utils/env.js";
import { connectMongo } from "./db/mongo.js";

async function start() {
  await connectMongo();

  const app = buildApp();

  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST
    });

    app.log.info(`API listening on ${env.HOST}:${env.PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
