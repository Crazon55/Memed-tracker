import { Router } from "express";
import { create, listLive, listMine } from "../controllers/campaign.controller";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";

export const campaignRouter = Router();

// Every campaign route needs a logged-in user
campaignRouter.use(requireAuth);

campaignRouter.post("/", requireRole("brand"), create);
campaignRouter.get("/mine", requireRole("brand"), listMine);
campaignRouter.get("/", listLive);
