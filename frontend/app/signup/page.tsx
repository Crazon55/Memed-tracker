"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, AuthResult, errorMessage } from "../../lib/api";
import { homePathFor, saveSession } from "../../lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("creator");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = await api<AuthResult>("/api/auth/signup", {
        method: "POST",
        body: { name, email, password, role },
      });
      saveSession(result);
      router.push(homePathFor(result.user.role));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <main className="auth">
      <h1>Sign up</h1>
      <div className="card">
        <form onSubmit={handleSubmit} className="form">
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            type="password"
            placeholder="Password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="creator">Creator</option>
            <option value="brand">Brand</option>
          </select>
          <button type="submit">Create account</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
      <p className="muted">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
