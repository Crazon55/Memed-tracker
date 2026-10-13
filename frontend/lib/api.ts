import { getSession, Session } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// The shapes the backend sends back
export interface Milestone {
  viewThreshold: number;
  payout: number;
}

export interface Campaign {
  id: string;
  name: string;
  platform: string;
  totalBudget: number;
  spent: number;
  remaining: number;
  exhausted: boolean;
  flaggedPosts: number;
  milestones: Milestone[];
}

export interface Submission {
  id: string;
  campaignId: string;
  campaignName: string;
  postLink: string;
  views: number;
  amountPaid: number;
  flagged: boolean;
}

export interface MySubmissions {
  totalEarnings: number;
  submissions: Submission[];
}

export interface UpdateViewsResult {
  paidNow: number;
  amountPaid: number;
  budgetRanOut: boolean;
  flagged: boolean;
}

export type AuthResult = Session;

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  auth?: boolean; // send the login token with the request
}

// The one place every request to the backend goes through
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (options.auth) {
    const session = getSession();
    if (session) {
      headers.Authorization = `Bearer ${session.token}`;
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const data: unknown = await response.json();

  // The backend sends { error: "message" } when something goes wrong
  if (!response.ok) {
    const errorBody = data as { error?: string };
    throw new Error(errorBody.error ?? "Request failed");
  }
  return data as T;
}

// Turn anything caught in a try/catch into a message we can show
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}
