import { Schema, model } from "mongoose";

// The only two roles in the app. To add a role, add its name here.
export type Role = "brand" | "creator";

// What one user looks like in MongoDB
export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
}

// Which fields exist and which are required
const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["brand", "creator"], required: true },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
