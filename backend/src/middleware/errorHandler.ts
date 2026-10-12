import { NextFunction, Request, Response } from "express";

// An error that carries an HTTP status code, e.g. 400 for bad input, 401 for not logged in
export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Every error in the app ends up here (controllers call next(err))
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Errors we threw on purpose have their own status code
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // Mongoose rejected the data (a required field is missing, a number is too low, ...)
  if (err.name === "ValidationError") {
    res.status(400).json({ error: err.message });
    return;
  }

  // Anything else is a bug on our side. Log it, but do not leak details to the client.
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
}
