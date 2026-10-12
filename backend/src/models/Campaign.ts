import { Schema, Types, model } from "mongoose";

export type Platform = "Instagram" | "YouTube";

// One step of the payout ladder, e.g. 10000 views -> Rs 500
export interface IMilestone {
  viewThreshold: number;
  payout: number;
}

// What one campaign looks like in MongoDB
export interface ICampaign {
  brand: Types.ObjectId; // the brand user who created it
  name: string;
  platform: Platform;
  totalBudget: number; // whole rupees
  spent: number; // rupees paid out so far, never above totalBudget
  exhausted: boolean; // true once the budget could not cover a full payout
  milestones: IMilestone[];
}

const milestoneSchema = new Schema<IMilestone>(
  {
    viewThreshold: { type: Number, required: true, min: 1 },
    payout: { type: Number, required: true, min: 1 },
  },
  { _id: false } // a milestone does not need its own id
);

const campaignSchema = new Schema<ICampaign>(
  {
    brand: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    platform: { type: String, enum: ["Instagram", "YouTube"], required: true },
    totalBudget: { type: Number, required: true, min: 1 },
    spent: { type: Number, default: 0, min: 0 },
    exhausted: { type: Boolean, default: false },
    milestones: { type: [milestoneSchema], required: true },
  },
  { timestamps: true }
);

export const Campaign = model<ICampaign>("Campaign", campaignSchema);
