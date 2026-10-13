import { Schema, Types, model } from "mongoose";

// What one submitted post looks like in MongoDB
export interface ISubmission {
  campaign: Types.ObjectId;
  creator: Types.ObjectId;
  postLink: string;
  views: number; // latest view count from the platform
  amountPaid: number; // rupees paid for this post so far, so we never pay twice
}

const submissionSchema = new Schema<ISubmission>(
  {
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    postLink: { type: String, required: true },
    views: { type: Number, default: 0, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// One post can only be submitted once, in any campaign, so it cannot be paid twice
submissionSchema.index({ postLink: 1 }, { unique: true });

export const Submission = model<ISubmission>("Submission", submissionSchema);
