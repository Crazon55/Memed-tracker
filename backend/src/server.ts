import { app } from "./app";
import { connectDb } from "./config/db";
import { env } from "./config/env";

// Connect to the database first, then start accepting requests
async function start(): Promise<void> {
  await connectDb();
  app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
