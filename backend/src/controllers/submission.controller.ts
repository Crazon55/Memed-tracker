import { NextFunction, Request, Response } from "express";
import { AuthRequest, getUser } from "../middleware/auth";
import * as submissionService from "../services/submission.service";

interface CreateBody {
  campaignId?: string;
  postLink?: string;
}

interface ViewsBody {
  views?: number;
}

// POST /api/submissions (creator only)
export async function create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getUser(req);
    const body = req.body as CreateBody;
    const submission = await submissionService.createSubmission(
      user.id,
      body.campaignId ?? "",
      body.postLink ?? ""
    );
    res.status(201).json(submission);
  } catch (err) {
    next(err);
  }
}

// GET /api/submissions/mine (creator only): my posts and total earnings
export async function listMine(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = getUser(req);
    res.json(await submissionService.getMySubmissions(user.id));
  } catch (err) {
    next(err);
  }
}

// PATCH /api/submissions/:id/views (no login needed, it simulates the platform)
export async function updateViews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as ViewsBody;
    const result = await submissionService.updateViews(req.params.id, body.views as number);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
