import mongoose from "mongoose";
import logger from "./logger";

let isConnected = false;

export async function connectDB(uri: string) {
  if (isConnected) return;
  try {
    mongoose.set("strictQuery", true); // harmless in v7
    await mongoose.connect(uri);       // no options needed
    isConnected = true;
    logger.info("✅ MongoDB connected");
  } catch (err) {
    logger.error({ err }, "❌ MongoDB connection error");
    throw err;
  }
}

export function onMongoEvents() {
  const conn = mongoose.connection;
  conn.on("connected", () => logger.debug("Mongo event: connected"));
  conn.on("reconnected", () => logger.debug("Mongo event: reconnected"));
  conn.on("disconnected", () => logger.warn("Mongo event: disconnected"));
  conn.on("error", (e) => logger.error({ e }, "Mongo event: error"));
}
