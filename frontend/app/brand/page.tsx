"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { api, Campaign, errorMessage } from "../../lib/api";
import { clearSession, getSession } from "../../lib/auth";

// One row of the milestone form. Kept as text while typing, turned into numbers on submit.
interface MilestoneRow {
  viewThreshold: string;
  payout: string;
}

export default function BrandPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [totalBudget, setTotalBudget] = useState("");
  const [rows, setRows] = useState<MilestoneRow[]>([
    { viewThreshold: "10000", payout: "500" },
    { viewThreshold: "50000", payout: "2000" },
    { viewThreshold: "100000", payout: "5000" },
  ]);
  const [error, setError] = useState("");
  // Stays false until we know the visitor is a logged-in brand
  const [ready, setReady] = useState(false);

  async function loadCampaigns() {
    try {
      setCampaigns(await api<Campaign[]>("/api/campaigns/mine", { auth: true }));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  // Runs once when the page opens: only brands may be here
  useEffect(() => {
    const session = getSession();
    if (!session || session.user.role !== "brand") {
      router.replace("/login");
      return;
    }
    setReady(true);
    loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Change one box in one milestone row
  function updateRow(index: number, field: "viewThreshold" | "payout", value: string) {
    const copy = [...rows];
    copy[index] = { ...copy[index], [field]: value };
    setRows(copy);
  }

  function addRow() {
    setRows([...rows, { viewThreshold: "", payout: "" }]);
  }

  function removeRow(index: number) {
    setRows(rows.filter((_, i) => i !== index));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    // Turn the typed text into numbers
    const milestones = [];
    for (const row of rows) {
      milestones.push({ viewThreshold: Number(row.viewThreshold), payout: Number(row.payout) });
    }

    try {
      await api<Campaign>("/api/campaigns", {
        method: "POST",
        auth: true,
        body: { name, platform, totalBudget: Number(totalBudget), milestones },
      });
      setName("");
      setTotalBudget("");
      await loadCampaigns();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  function logout() {
    clearSession();
    router.push("/login");
  }

  // How much of the budget is used, as a number from 0 to 100 (for the bar)
  function percentUsed(campaign: Campaign): number {
    return Math.round((campaign.spent / campaign.totalBudget) * 100);
  }

  // Show nothing but "Loading..." until the role check has passed
  if (!ready) {
    return (
      <main>
        <p className="muted">Loading...</p>
      </main>
    );
  }

  return (
    <main>
      <div className="page-header">
        <h1>Brand dashboard</h1>
        <button className="secondary" onClick={logout}>
          Log out
        </button>
      </div>

      <h2>Create a campaign</h2>
      <div className="card">
        <form onSubmit={handleSubmit} className="form">
          <input placeholder="Campaign name" value={name} onChange={(e) => setName(e.target.value)} />
          <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="Instagram">Instagram</option>
            <option value="YouTube">YouTube</option>
          </select>
          <input
            placeholder="Total budget (Rs)"
            value={totalBudget}
            onChange={(e) => setTotalBudget(e.target.value)}
          />

          <strong>Milestones (views, then payout in Rs)</strong>
          {rows.map((row, index) => (
            <div key={index} className="row">
              <input
                placeholder="Views"
                value={row.viewThreshold}
                onChange={(e) => updateRow(index, "viewThreshold", e.target.value)}
              />
              <input
                placeholder="Payout"
                value={row.payout}
                onChange={(e) => updateRow(index, "payout", e.target.value)}
              />
              <button type="button" className="secondary" onClick={() => removeRow(index)}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="secondary" onClick={addRow}>
            Add milestone
          </button>
          <button type="submit">Create campaign</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>

      <h2>Your campaigns</h2>
      {campaigns.length === 0 && <p className="muted">No campaigns yet.</p>}
      {campaigns.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Platform</th>
                <th>Budget</th>
                <th>Spent</th>
                <th>Remaining</th>
                <th>Used</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.platform}</td>
                  <td>Rs {c.totalBudget}</td>
                  <td>Rs {c.spent}</td>
                  <td>Rs {c.remaining}</td>
                  <td>
                    <div className="bar">
                      <div style={{ width: `${percentUsed(c)}%` }} />
                    </div>
                  </td>
                  <td>
                    <span className={c.exhausted ? "badge done" : "badge live"}>
                      {c.exhausted ? "Exhausted" : "Live"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
