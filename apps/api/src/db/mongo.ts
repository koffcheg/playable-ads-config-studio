import { MongoClient, Db, Collection } from "mongodb";
import type {
  AgentBriefInput,
  AgentConcept,
  AgentRunStep,
  GeneratePlayableAdInput,
  PlayableAdConfig
} from "@studio/shared";
import { env } from "../utils/env.js";
import { DatabaseError } from "../utils/errors.js";

export type PlayableAdDocument = {
  mode?: "manual" | "agent";
  input: GeneratePlayableAdInput;
  brief?: AgentBriefInput;
  concept?: AgentConcept;
  steps?: AgentRunStep[];
  output: PlayableAdConfig;
  provider: string;
  createdAt: string;
};

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(): Promise<Db> {
  if (db) return db;

  try {
    client = new MongoClient(env.MONGO_URL);
    await client.connect();
    db = client.db(env.MONGO_DB_NAME);
    return db;
  } catch (error) {
    throw new DatabaseError("Failed to connect to MongoDB", error);
  }
}

export async function getPlayableAdsCollection(): Promise<Collection<PlayableAdDocument>> {
  try {
    const database = await connectMongo();
    return database.collection<PlayableAdDocument>("playable_ad_generations");
  } catch (error) {
    if (error instanceof DatabaseError) throw error;
    throw new DatabaseError("Failed to access playable ads collection", error);
  }
}
