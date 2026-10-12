import { HydratedDocument } from "mongoose";
import { HttpError } from "../middleware/errorHandler";
import { Campaign, ICampaign, IMilestone } from "../models/Campaign";

// What the brand sends when creating a campaign (any field may be missing, we check)
export interface CampaignInput {
  name?: string;
  platform?: string;
  totalBudget?: number;
  milestones?: { viewThreshold?: number; payout?: number }[];
}

// What we send back to the frontend for one campaign
export interface CampaignView {
  id: string;
  name: string;
  platform: string;
  totalBudget: number;
  spent: number;
  remaining: number; // totalBudget - spent, worked out here, not stored
  exhausted: boolean;
  milestones: IMilestone[];
}

// True for whole numbers above zero, like 500 (not 0, -5 or 2.5)
function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

// Turn a database record into the plain object we send out
function toView(campaign: HydratedDocument<ICampaign>): CampaignView {
  const milestones: IMilestone[] = [];
  for (const m of campaign.milestones) {
    milestones.push({ viewThreshold: m.viewThreshold, payout: m.payout });
  }

  return {
    id: campaign._id.toString(),
    name: campaign.name,
    platform: campaign.platform,
    totalBudget: campaign.totalBudget,
    spent: campaign.spent,
    remaining: campaign.totalBudget - campaign.spent,
    exhausted: campaign.exhausted,
    milestones: milestones,
  };
}

export async function createCampaign(brandId: string, input: CampaignInput): Promise<CampaignView> {
  if (!input.name) {
    throw new HttpError(400, "name is required");
  }
  if (input.platform !== "Instagram" && input.platform !== "YouTube") {
    throw new HttpError(400, "platform must be Instagram or YouTube");
  }
  if (!isPositiveInteger(input.totalBudget)) {
    throw new HttpError(400, "totalBudget must be a whole number above 0");
  }
  if (!input.milestones || input.milestones.length === 0) {
    throw new HttpError(400, "add at least one milestone");
  }

  // Check every milestone, and copy it into a clean list
  const milestones: IMilestone[] = [];
  for (const m of input.milestones) {
    if (!isPositiveInteger(m.viewThreshold) || !isPositiveInteger(m.payout)) {
      throw new HttpError(400, "each milestone needs a whole viewThreshold and payout above 0");
    }
    milestones.push({ viewThreshold: m.viewThreshold, payout: m.payout });
  }

  // Keep the ladder in order, lowest views first
  milestones.sort((a, b) => a.viewThreshold - b.viewThreshold);

  const campaign = await Campaign.create({
    brand: brandId,
    name: input.name,
    platform: input.platform,
    totalBudget: input.totalBudget,
    milestones: milestones,
  });
  return toView(campaign);
}

// Live campaign = the budget is not used up yet (spent is still below totalBudget)
export async function listLiveCampaigns(): Promise<CampaignView[]> {
  const campaigns = await Campaign.find({ $expr: { $lt: ["$spent", "$totalBudget"] } }).sort({
    createdAt: -1,
  });

  const result: CampaignView[] = [];
  for (const campaign of campaigns) {
    result.push(toView(campaign));
  }
  return result;
}

// All campaigns made by one brand, with spent and remaining
export async function listBrandCampaigns(brandId: string): Promise<CampaignView[]> {
  const campaigns = await Campaign.find({ brand: brandId }).sort({ createdAt: -1 });

  const result: CampaignView[] = [];
  for (const campaign of campaigns) {
    result.push(toView(campaign));
  }
  return result;
}
