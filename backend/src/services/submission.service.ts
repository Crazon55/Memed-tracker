import { HttpError } from "../middleware/errorHandler";
import { Campaign } from "../models/Campaign";
import { Submission } from "../models/Submission";
import { claimBudget, markExhaustedIfFull, refundBudget } from "./campaign.service";
import { calculatePayout } from "./payout";
import { isViewSpike } from "./spike";

// If other requests keep changing the same data, we retry a few times, then give up
const MAX_ATTEMPTS = 5;

export interface SubmissionView {
  id: string;
  campaignId: string;
  campaignName: string;
  postLink: string;
  views: number;
  amountPaid: number;
  flagged: boolean; // true if the views jumped unusually fast
}

export interface UpdateViewsResult {
  id: string;
  views: number;
  amountPaid: number; // total paid for this post so far
  paidNow: number; // paid by this update
  budgetRanOut: boolean; // true if the campaign could not cover the full amount owed
  flagged: boolean; // true if the views jumped unusually fast (the payment still went through)
}

export interface MySubmissions {
  totalEarnings: number;
  submissions: SubmissionView[];
}

// A creator submits a post link to a campaign
export async function createSubmission(
  creatorId: string,
  campaignId: string,
  postLink: string
): Promise<SubmissionView> {
  if (!campaignId || !postLink) {
    throw new HttpError(400, "campaignId and postLink are required");
  }

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    throw new HttpError(404, "campaign not found");
  }
  if (campaign.spent >= campaign.totalBudget) {
    throw new HttpError(400, "this campaign has no budget left");
  }

  // A post can only be submitted once, to any campaign, so it can never be paid twice
  const link = postLink.trim();
  const existing = await Submission.findOne({ postLink: link });
  if (existing) {
    throw new HttpError(409, "this post was already submitted");
  }

  const submission = await Submission.create({
    campaign: campaign._id,
    creator: creatorId,
    postLink: link,
  });

  return {
    id: submission._id.toString(),
    campaignId: campaign._id.toString(),
    campaignName: campaign.name,
    postLink: submission.postLink,
    views: submission.views,
    amountPaid: submission.amountPaid,
    flagged: submission.flagged,
  };
}

// A creator's posts and their total earnings
export async function getMySubmissions(creatorId: string): Promise<MySubmissions> {
  const submissions = await Submission.find({ creator: creatorId }).sort({ createdAt: -1 });

  // Look up campaign names in one query, then match them by id
  const campaignIds = submissions.map((s) => s.campaign);
  const campaigns = await Campaign.find({ _id: { $in: campaignIds } });
  const nameById: Record<string, string> = {};
  for (const campaign of campaigns) {
    nameById[campaign._id.toString()] = campaign.name;
  }

  let totalEarnings = 0;
  const result: SubmissionView[] = [];
  for (const s of submissions) {
    totalEarnings += s.amountPaid;
    result.push({
      id: s._id.toString(),
      campaignId: s.campaign.toString(),
      campaignName: nameById[s.campaign.toString()] ?? "(deleted campaign)",
      postLink: s.postLink,
      views: s.views,
      amountPaid: s.amountPaid,
      flagged: s.flagged,
    });
  }

  return { totalEarnings, submissions: result };
}

// The platform reports a new view count for a post. Work out the payout and record it.
export async function updateViews(submissionId: string, views: number): Promise<UpdateViewsResult> {
  if (typeof views !== "number" || !Number.isInteger(views) || views < 0) {
    throw new HttpError(400, "views must be a whole number, 0 or more");
  }

  // Each loop re-reads fresh data. We only go round again if another request
  // changed the same data while we were working.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      throw new HttpError(404, "submission not found");
    }
    const campaign = await Campaign.findById(submission.campaign);
    if (!campaign) {
      throw new HttpError(404, "campaign not found");
    }

    // The pure calculation: how much should we pay right now?
    const payout = calculatePayout({
      views: views,
      milestones: campaign.milestones,
      amountPaid: submission.amountPaid,
      remainingBudget: campaign.totalBudget - campaign.spent,
    });

    // Did the views jump unusually fast? If so, mark the post for a person to review.
    // The payment still goes through: a flag never blocks it. Once flagged, it stays flagged.
    const spike = isViewSpike(submission.views, views);
    const viewFields: { views: number; flagged?: boolean } = { views: views };
    if (spike) {
      viewFields.flagged = true;
    }

    // Nothing to pay: just save the new view count (and the flag, if any)
    if (payout.amountToPay === 0) {
      await Submission.updateOne({ _id: submission._id }, { $set: viewFields });
      return {
        id: submissionId,
        views: views,
        amountPaid: submission.amountPaid,
        paidNow: 0,
        budgetRanOut: payout.budgetRanOut,
        flagged: spike || submission.flagged,
      };
    }

    // Step A: take the money from the campaign budget (atomic, never overspends)
    const claimed = await claimBudget(campaign._id, payout.amountToPay);
    if (!claimed) {
      continue; // someone else spent from this campaign meanwhile, so recalculate
    }

    // Step B: record the payment on the post, but only if amountPaid is still what we
    // read earlier. If another request paid this post first, nothing matches here.
    const updated = await Submission.findOneAndUpdate(
      { _id: submission._id, amountPaid: submission.amountPaid },
      { $set: viewFields, $inc: { amountPaid: payout.amountToPay } },
      { new: true }
    );
    if (!updated) {
      await refundBudget(campaign._id, payout.amountToPay); // undo Step A, then try again
      continue;
    }

    await markExhaustedIfFull(campaign._id);
    return {
      id: submissionId,
      views: views,
      amountPaid: updated.amountPaid,
      paidNow: payout.amountToPay,
      budgetRanOut: payout.budgetRanOut,
      flagged: updated.flagged,
    };
  }

  throw new HttpError(409, "too many updates at the same time, please try again");
}
