import mongoose from "mongoose";
import { config } from "./env.js";

export async function connectDB() {
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 5000 });
  // Build indexes (e.g. unique user email) before the API starts taking requests.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}
