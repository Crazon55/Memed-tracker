import { IMilestone } from "../models/Campaign";

// Everything the calculation needs. It never reads the database.
export interface PayoutInput {
  views: number; // the post's new view count
  milestones: IMilestone[]; // the campaign's ladder
  amountPaid: number; // rupees already paid for this post
  remainingBudget: number; // rupees left in the campaign (totalBudget - spent)
}

export interface PayoutResult {
  earnedTotal: number; // what the post has earned in total at these views
  amountToPay: number; // new rupees to pay right now (can be 0)
  budgetRanOut: boolean; // true if we could not pay the full amount owed
}

// Works out how much to pay for a post right now.
// Pure function: same input always gives the same output, so it is easy to test.
export function calculatePayout(input: PayoutInput): PayoutResult {
  // Step 1: find the highest milestone the post has crossed.
  // Only that one counts, we do not add up the lower ones.
  let earnedTotal = 0;
  let highestThreshold = 0;
  for (const milestone of input.milestones) {
    const crossed = input.views >= milestone.viewThreshold;
    if (crossed && milestone.viewThreshold > highestThreshold) {
      highestThreshold = milestone.viewThreshold;
      earnedTotal = milestone.payout;
    }
  }

  // Step 2: subtract what we already paid, so the same views are never paid twice.
  // If views went down, this would be negative, so we pay 0 (no clawback).
  let owed = earnedTotal - input.amountPaid;
  if (owed < 0) {
    owed = 0;
  }

  // Step 3: never pay more than the campaign has left.
  let available = input.remainingBudget;
  if (available < 0) {
    available = 0;
  }

  let amountToPay = owed;
  let budgetRanOut = false;
  if (owed > available) {
    amountToPay = available; // partial payout: give what is left
    budgetRanOut = true;
  }

  return { earnedTotal, amountToPay, budgetRanOut };
}
