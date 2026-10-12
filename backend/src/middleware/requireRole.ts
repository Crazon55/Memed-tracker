import { NextFunction, Response } from "express";
import { Role } from "../models/User";
import { AuthRequest } from "./auth";
import { HttpError } from "./errorHandler";

// Put this after requireAuth to allow only one role, e.g. requireRole("brand")
export function requireRole(role: Role) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
      next(new HttpError(403, `only a ${role} can do this`));
      return;
    }
    next();
  };
}
