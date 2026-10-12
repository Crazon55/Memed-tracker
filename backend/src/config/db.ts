import mongoose from "mongoose";
import { env } from "./env";

// Open the MongoDB connection once, when the server starts
export async function connectDb(): Promise<void> {
  await mongoose.connect(env.mongoUri);
  console.log("MongoDB connected");
}
