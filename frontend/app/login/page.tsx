"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, AuthResult, errorMessage } from "../../lib/api";
import { homePathFor, saveSession } from "../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); // stop the browser reloading the page
    setError("");
    try {
      const result = await api<AuthResult>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      saveSession(result);
      router.push(homePathFor(result.user.role));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <main>
      <h1>Log in</h1>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8, maxWidth: 320 }}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Log in</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <p>
        No account? <Link href="/signup">Sign up</Link>
      </p>
    </main>
  );
}
