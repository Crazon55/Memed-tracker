import { Router } from "express";
import { create, listMine, updateViews } from "../controllers/submission.controller";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";

export const submissionRouter = Router();

submissionRouter.post("/", requireAuth, requireRole("creator"), create);
submissionRouter.get("/mine", requireAuth, requireRole("creator"), listMine);

// No requireAuth and no requireRole on purpose: it simulates the platform reporting views
submissionRouter.patch("/:id/views", updateViews);
