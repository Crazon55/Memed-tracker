import dotenv from "dotenv";

// Load variables from backend/.env into process.env
dotenv.config();

// Read one required variable, and fail loudly at startup if it is missing
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Remove stray spaces/newlines and a trailing slash from a URL setting.
// "https://site.app/" would never match the browser's origin "https://site.app",
// and a newline inside a header value makes Node throw an error on every request.
function cleanUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

// All settings in one place, so the rest of the code never touches process.env
export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required("MONGODB_URI"),
  jwtSecret: required("JWT_SECRET"),
  clientOrigin: cleanUrl(process.env.CLIENT_ORIGIN ?? "http://localhost:3000"),
};
