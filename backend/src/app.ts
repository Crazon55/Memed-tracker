import express from "express";
import cors from "cors";
import { env } from "./config/env";

// Build the Express app. Routes and the error handler are added in later commits.
export const app = express();

app.use(cors({ origin: env.clientOrigin }));
app.use(express.json());

// Simple check that the server is up (used by Render and Docker)
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
