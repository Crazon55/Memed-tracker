import { HydratedDocument, Types } from "mongoose";
import { HttpError } from "../middleware/errorHandler";
import { Campaign, ICampaign, IMilestone } from "../models/Campaign";
import { Submission } from "../models/Submission";

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
  flaggedPosts: number; // posts in this campaign whose views jumped unusually fast
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
    flaggedPosts: 0, // filled in by listBrandCampaigns
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

// Take `amount` rupees out of the campaign budget, but ONLY if it still fits.
// The check and the update happen in ONE database operation, so two requests at the
// same moment cannot both pass the check. Returns false if it no longer fits.
export async function claimBudget(campaignId: Types.ObjectId, amount: number): Promise<boolean> {
  const updated = await Campaign.findOneAndUpdate(
    {
      _id: campaignId,
      // only match if spent + amount is still within totalBudget
      $expr: { $lte: [{ $add: ["$spent", amount] }, "$totalBudget"] },
    },
    { $inc: { spent: amount } } // $inc adds to the stored number inside the database
  );
  return updated !== null; // null means no campaign matched, so the budget did not fit
}

// Give a claimed amount back (used when the submission could not be updated after the claim)
export async function refundBudget(campaignId: Types.ObjectId, amount: number): Promise<void> {
  await Campaign.updateOne({ _id: campaignId }, { $inc: { spent: -amount }, $set: { exhausted: false } });
}

// Set exhausted = true if the whole budget is now used up
export async function markExhaustedIfFull(campaignId: Types.ObjectId): Promise<void> {
  await Campaign.updateOne(
    { _id: campaignId, $expr: { $gte: ["$spent", "$totalBudget"] } },
    { $set: { exhausted: true } }
  );
}

// All campaigns made by one brand, with spent and remaining
export async function listBrandCampaigns(brandId: string): Promise<CampaignView[]> {
  const campaigns = await Campaign.find({ brand: brandId }).sort({ createdAt: -1 });

  // Count the flagged posts in each campaign, using one query for all of them
  const campaignIds = campaigns.map((c) => c._id);
  const flaggedPosts = await Submission.find({ campaign: { $in: campaignIds }, flagged: true });
  const flaggedCount: Record<string, number> = {};
  for (const post of flaggedPosts) {
    const key = post.campaign.toString();
    flaggedCount[key] = (flaggedCount[key] ?? 0) + 1;
  }

  const result: CampaignView[] = [];
  for (const campaign of campaigns) {
    const view = toView(campaign);
    view.flaggedPosts = flaggedCount[view.id] ?? 0;
    result.push(view);
  }
  return result;
}
