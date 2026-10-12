import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { HttpError } from "../middleware/errorHandler";
import { Role, User } from "../models/User";

// What we send back after a successful signup or login
export interface AuthResult {
  token: string;
  user: { id: string; name: string; email: string; role: Role };
}

// Make a login token that holds the user's id and role. It expires in 7 days.
function createToken(userId: string, role: Role): string {
  return jwt.sign({ id: userId, role: role }, env.jwtSecret, { expiresIn: "7d" });
}

export async function signup(
  name: string,
  email: string,
  password: string,
  role: string
): Promise<AuthResult> {
  if (!name || !email || !password) {
    throw new HttpError(400, "name, email and password are required");
  }
  if (password.length < 6) {
    throw new HttpError(400, "password must be at least 6 characters");
  }
  if (role !== "brand" && role !== "creator") {
    throw new HttpError(400, "role must be brand or creator");
  }

  // Emails must be unique (stored lowercase in the model)
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new HttpError(409, "an account with this email already exists");
  }

  // Never store the real password, only a scrambled version of it (10 = how much scrambling)
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role });

  const id = user._id.toString();
  return {
    token: createToken(id, user.role),
    user: { id, name: user.name, email: user.email, role: user.role },
  };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  if (!email || !password) {
    throw new HttpError(400, "email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  // Same message for "no such user" and "wrong password", so nobody can probe which emails exist
  if (!user) {
    throw new HttpError(401, "invalid email or password");
  }
  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new HttpError(401, "invalid email or password");
  }

  const id = user._id.toString();
  return {
    token: createToken(id, user.role),
    user: { id, name: user.name, email: user.email, role: user.role },
  };
}
