import { NextFunction, Request, Response } from "express";
import * as authService from "../services/auth.service";

// What the client sends in the request body (any field can be missing, the service checks)
interface SignupBody {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
}

interface LoginBody {
  email?: string;
  password?: string;
}

// POST /api/auth/signup
export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as SignupBody;
    const result = await authService.signup(
      body.name ?? "",
      body.email ?? "",
      body.password ?? "",
      body.role ?? ""
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as LoginBody;
    const result = await authService.login(body.email ?? "", body.password ?? "");
    res.json(result);
  } catch (err) {
    next(err);
  }
}
