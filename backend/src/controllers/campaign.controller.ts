import { NextFunction, Response } from "express";
import { AuthRequest, getUser } from "../middleware/auth";
import * as campaignService from "../services/campaign.service";

// POST /api/campaigns (brand only)
export async function create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getUser(req);
    const campaign = await campaignService.createCampaign(user.id, req.body as campaignService.CampaignInput);
    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
}

// GET /api/campaigns (any logged-in user): campaigns with budget left
export async function listLive(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await campaignService.listLiveCampaigns());
  } catch (err) {
    next(err);
  }
}

// GET /api/campaigns/mine (brand only): my campaigns with spent vs remaining
export async function listMine(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getUser(req);
    res.json(await campaignService.listBrandCampaigns(user.id));
  } catch (err) {
    next(err);
  }
}
