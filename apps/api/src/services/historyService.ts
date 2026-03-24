import { getPlayableAdsCollection } from "../db/mongo.js";
import { DatabaseError, NotFoundError } from "../utils/errors.js";
import type { PlayableAdHistoryListItem } from "@studio/shared";

export async function getHistory(): Promise<PlayableAdHistoryListItem[]> {
  try {
    const collection = await getPlayableAdsCollection();
    const records = await collection
      .find({}, { projection: { input: 1, output: 1, provider: 1, createdAt: 1, mode: 1 } })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    return records.map((record) => ({
      id: record.output.id,
      theme: record.output.theme,
      gameType: record.output.gameType,
      provider: record.provider,
      status: record.output.status,
      mode: record.mode === "agent" ? "agent" : "manual",
      createdAt: record.createdAt
    }));
  } catch (error) {
    throw new DatabaseError("Failed to load playable ad history", error);
  }
}

export async function getHistoryById(id: string) {
  try {
    const collection = await getPlayableAdsCollection();
    const item = await collection.findOne({ "output.id": id });

    if (!item) {
      throw new NotFoundError(`Playable ad generation with id '${id}' was not found`);
    }

    return item;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to load playable ad generation", error);
  }
}
