import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { Role } from "../models/User";
import { HttpError } from "./errorHandler";

// Who is logged in. Filled in by requireAuth below.
export interface AuthUser {
  id: string;
  role: Role;
}

// A normal Express request, plus the logged-in user once requireAuth has run
export interface AuthRequest extends Request {
  user?: AuthUser;
}

// Put this before any route that needs a logged-in user
export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  // The browser sends: Authorization: Bearer <token>
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    next(new HttpError(401, "please log in"));
    return;
  }
  const token = header.slice("Bearer ".length);

  try {
    // verify throws if the token is fake, edited or expired
    const decoded = jwt.verify(token, env.jwtSecret);
    if (
      typeof decoded === "string" ||
      typeof decoded.id !== "string" ||
      (decoded.role !== "brand" && decoded.role !== "creator")
    ) {
      next(new HttpError(401, "invalid token"));
      return;
    }
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch {
    next(new HttpError(401, "invalid or expired token"));
  }
}
