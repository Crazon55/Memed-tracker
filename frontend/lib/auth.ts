// Keeps the logged-in user's token in the browser (localStorage) so a page refresh does not log you out

export type Role = "brand" | "creator";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Session {
  token: string;
  user: SessionUser;
}

const STORAGE_KEY = "memed_session";

export function saveSession(session: Session): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

// Returns null when nobody is logged in
export function getSession(): Session | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Which page each role starts on
export function homePathFor(role: Role): string {
  return role === "brand" ? "/brand" : "/creator";
}
