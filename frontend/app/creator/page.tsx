"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { api, Campaign, errorMessage, MySubmissions, UpdateViewsResult } from "../../lib/api";
import { clearSession, getSession } from "../../lib/auth";

export default function CreatorPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [mine, setMine] = useState<MySubmissions>({ totalEarnings: 0, submissions: [] });
  const [campaignId, setCampaignId] = useState("");
  const [postLink, setPostLink] = useState("");
  // What the user typed into each post's "views" box, keyed by submission id
  const [viewsInput, setViewsInput] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadAll() {
    try {
      setCampaigns(await api<Campaign[]>("/api/campaigns", { auth: true }));
      setMine(await api<MySubmissions>("/api/submissions/mine", { auth: true }));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  // Runs once when the page opens: only creators may be here
  useEffect(() => {
    const session = getSession();
    if (!session || session.user.role !== "creator") {
      router.replace("/login");
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api("/api/submissions", {
        method: "POST",
        auth: true,
        body: { campaignId, postLink },
      });
      setPostLink("");
      await loadAll();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  // Simulates the platform reporting a new view count for a post
  async function sendViews(submissionId: string) {
    setError("");
    setMessage("");
    try {
      const result = await api<UpdateViewsResult>(`/api/submissions/${submissionId}/views`, {
        method: "PATCH",
        body: { views: Number(viewsInput[submissionId]) },
      });
      let text = `Paid Rs ${result.paidNow} now (Rs ${result.amountPaid} total for this post).`;
      if (result.budgetRanOut) {
        text += " The campaign budget ran out, so this was a partial payout.";
      }
      setMessage(text);
      await loadAll();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function logout() {
    clearSession();
    router.push("/login");
  }

  return (
    <main>
      <h1>Creator dashboard</h1>
      <button onClick={logout}>Log out</button>
      <h2>Total earnings: Rs {mine.totalEarnings}</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {message && <p style={{ color: "green" }}>{message}</p>}

      <h2>Live campaigns</h2>
      {campaigns.length === 0 && <p>No live campaigns right now.</p>}
      {campaigns.map((c) => (
        <div key={c.id} style={{ border: "1px solid #ccc", padding: 8, marginBottom: 8 }}>
          <strong>{c.name}</strong> ({c.platform}), Rs {c.remaining} left
          <div>
            {c.milestones.map((m) => `${m.viewThreshold} views = Rs ${m.payout}`).join(" | ")}
          </div>
        </div>
      ))}

      <h2>Submit a post</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8, maxWidth: 420 }}>
        <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
          <option value="">Choose a campaign</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          placeholder="Post link"
          value={postLink}
          onChange={(e) => setPostLink(e.target.value)}
        />
        <button type="submit">Submit post</button>
      </form>

      <h2>Your posts</h2>
      {mine.submissions.length === 0 && <p>No posts yet.</p>}
      {mine.submissions.map((s) => (
        <div key={s.id} style={{ border: "1px solid #ccc", padding: 8, marginBottom: 8 }}>
          <div>
            {s.campaignName}: {s.postLink}
          </div>
          <div>
            {s.views} views, Rs {s.amountPaid} earned
          </div>
          <div>
            {/* Demo only: stands in for Instagram/YouTube reporting new views */}
            <input
              placeholder="Simulate new view count"
              value={viewsInput[s.id] ?? ""}
              onChange={(e) => setViewsInput({ ...viewsInput, [s.id]: e.target.value })}
            />
            <button onClick={() => sendViews(s.id)}>Update views</button>
          </div>
        </div>
      ))}
    </main>
  );
}
