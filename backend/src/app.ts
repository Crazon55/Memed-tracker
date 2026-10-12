import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth.routes";
import { campaignRouter } from "./routes/campaign.routes";

// Build the Express app. More routes are added in later commits.
export const app = express();

app.use(cors({ origin: env.clientOrigin }));
app.use(express.json());

// Simple check that the server is up (used by Render and Docker)
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/campaigns", campaignRouter);

// Must be last, so it catches errors from everything above
app.use(errorHandler);
