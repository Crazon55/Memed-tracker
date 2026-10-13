# Meme'd Campaign Payout Tracker

A small web app where brands run campaigns and creators post content for them. Creators are paid through a milestone ladder (for example 10K views = Rs 500, 50K = Rs 2,000, 100K = Rs 5,000), and a campaign can never pay out more than its budget.

- **Backend:** Node.js, TypeScript, Express, MongoDB (Mongoose), JWT auth
- **Frontend:** Next.js (App Router), TypeScript
- **Tests:** Jest
- **Extras:** atomic budget updates, idempotent payouts, Docker

**Live links**

- Frontend: https://memed-tracker.vercel.app
- Backend API: https://memed-tracker-api.onrender.com (health check: `/health`)

The backend runs on Render's free plan and goes to sleep when idle, so the first request after a quiet period can take up to a minute.

**Try it in five steps**

1. Sign up as a **Brand**, create a campaign with a budget (for example Rs 3000) and keep the default milestones.
2. Log out, sign up as a **Creator**, and submit a post link to that campaign.
3. Under "Your posts", enter a view count (this stands in for Instagram or YouTube reporting views) and click **Update views**.
4. Send a bigger number later: only the difference is paid, and repeating the same number pays nothing.
5. Log back in as the brand to see spent vs remaining. When the budget is used up the campaign shows as **Exhausted**.

## Project structure

```
backend/src/
  config/        env.ts (reads env vars), db.ts (MongoDB connection)
  models/        User.ts, Campaign.ts, Submission.ts
  middleware/    auth.ts (login check), requireRole.ts, errorHandler.ts
  services/      payout.ts (pure payout calculation, no database)
                 campaign.service.ts, submission.service.ts, auth.service.ts
  controllers/   thin: read the request, call a service, send the response
  routes/        auth, campaign, submission URLs
  __tests__/     payout.test.ts, budget.test.ts
frontend/
  app/           login, signup, brand and creator pages
  lib/           api.ts (the one fetch wrapper), auth.ts (token storage)
```

## Setup

You need Node.js 20+ and a MongoDB database (local, or a free MongoDB Atlas cluster).

### 1. Backend

```
cd backend
cp .env.example .env     # then edit .env (see the table below)
npm install
npm run dev              # runs on http://localhost:4000
```

### 2. Frontend

```
cd frontend
cp .env.example .env.local
npm install
npm run dev              # runs on http://localhost:3000
```

### 3. Tests

```
cd backend
npm test
```

### Docker (optional)

```
docker compose up --build
```

This starts MongoDB, the backend (port 4000) and the frontend (port 3000). Set `JWT_SECRET` in your shell first for anything other than a quick try.

## Environment variables

**backend/.env**

| Variable | Required | Meaning |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Long random string used to sign login tokens |
| `PORT` | no (4000) | Port the API listens on |
| `CLIENT_ORIGIN` | no (http://localhost:3000) | Frontend URL allowed by CORS |

**frontend/.env.local**

| Variable | Required | Meaning |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | Base URL of the backend, no trailing slash |

## API

| Method and URL | Who | What it does |
|---|---|---|
| `POST /api/auth/signup` | anyone | Create an account (role `brand` or `creator`) |
| `POST /api/auth/login` | anyone | Log in, returns a token |
| `POST /api/campaigns` | brand | Create a campaign with a milestone ladder |
| `GET /api/campaigns/mine` | brand | My campaigns with spent and remaining |
| `GET /api/campaigns` | logged in | Live campaigns (budget left) |
| `POST /api/submissions` | creator | Submit a post link to a campaign |
| `GET /api/submissions/mine` | creator | My posts and total earnings |
| `PATCH /api/submissions/:id/views` | nobody (no check) | Report a new view count and pay out |

Send the token as `Authorization: Bearer <token>`.

## How payouts work

1. The platform (simulated by the `PATCH .../views` endpoint) reports a view count.
2. `services/payout.ts` finds the highest milestone crossed, subtracts what was already paid for that post, and limits the result to the campaign's remaining budget.
3. The money is taken from the campaign budget with a single conditional database update, so two requests at the same moment cannot both spend the same money.
4. The post's `amountPaid` is updated only if it has not changed since it was read. If another request paid the same post first, the budget claim is given back and the calculation is retried (up to 5 times).

## Assumptions

- **Several milestones crossed at once:** only the highest crossed milestone counts. Its amount is the post's total payout (10K = Rs 500 and 50K = Rs 2,000 means Rs 2,000 at 60K views, not Rs 2,500).
- **Idempotent payouts:** amount owed = highest milestone amount minus the amount already paid for that post. Repeating the same update pays nothing more. If views go down, nothing is paid back or taken away.
- **Budget runs out mid-payout:** the creator receives whatever is left (a partial payout), it is recorded in `amountPaid`, and the campaign is marked `exhausted`. The unpaid difference stays unpaid, because there is no way to top up a budget in this version.
- **Live campaign:** a campaign with remaining budget above zero (`spent < totalBudget`). Submitting to a campaign with no budget left is rejected.
- **Money is whole rupees** (integers), so there are no rounding issues.
- **The views endpoint has no login or role check**, as the brief asks. In a real system it would be a signed webhook or an API key from the platform.
- **One post link can be submitted once per campaign.**
- **The view count is stored as the latest reported value**, even if it is lower than before.
- **Milestones are sorted by views when a campaign is created.** The highest threshold crossed wins; the ladder is not checked for rising payouts.
- **Roles are chosen at signup.** There is no admin role.
- **No database transactions.** The budget claim and the post update are two steps. If the second one fails because another request got there first, the first one is undone. This works on a standalone MongoDB, not only on a replica set.
- **The login token is kept in the browser's localStorage.** That keeps the frontend simple. A production app would use an httpOnly cookie.
- **Links are not checked** against Instagram or YouTube, and the platform field is only a label.

## How this scales to 10,000 creators

The backend keeps no state between requests, so the first step is easy: run several copies behind a load balancer (the Docker image already supports this). The database is where the real limits are.

- **Hot campaign document.** Every payout for a campaign updates the same `spent` field. With thousands of creators on one campaign these updates queue up behind each other. Options: split the budget into several slices that creators claim from, or process payouts for a campaign through a queue, one at a time.
- **View updates.** Real platforms report views in large batches. Put those updates on a queue (SQS, or Redis with BullMQ) and process them with workers instead of calling the API directly, so spikes do not hit the database.
- **Indexes.** Add indexes on `Submission.creator` and `Submission.campaign`, and on the campaign `spent`/`totalBudget` fields used by the live list. Without them the list pages get slower as the data grows.
- **Pagination and caching.** The campaign and post lists need paging. The live campaign list is read far more than it changes, so cache it (for example in Redis) for a few seconds.
- **Safer money updates.** Run MongoDB as a replica set and use transactions for the "claim budget and update the post" step, so there is no undo step.
- **Operations.** Rate limits, structured logs, alerts on failed payouts, and a daily check that the sum of `amountPaid` equals the campaign's `spent`.

## Where to change what

| I want to... | Change this |
|---|---|
| Change the payout rule | `backend/src/services/payout.ts` |
| Change how the budget is protected from overspending | `claimBudget` in `backend/src/services/campaign.service.ts` |
| Change what happens when the budget runs out | `payout.ts` (step 3) and `submission.service.ts` |
| Change what counts as a live campaign | `listLiveCampaigns` in `campaign.service.ts` |
| Add a role | `models/User.ts` (the `Role` type and `enum`), then use `requireRole("...")` in the routes |
| Add a field to campaigns | `models/Campaign.ts`, `campaign.service.ts` (`CampaignInput`, `createCampaign`, `toView`), `frontend/lib/api.ts`, `frontend/app/brand/page.tsx` |
| Add or remove a platform | `models/Campaign.ts` and the platform check in `campaign.service.ts`, plus the dropdown in `frontend/app/brand/page.tsx` |
| Add an endpoint | a function in a service, a controller, a route in `routes/`, and mount the router in `app.ts` |
| Change login token lifetime | `createToken` in `services/auth.service.ts` |
| Change error messages or status codes | `middleware/errorHandler.ts` |
| Add an environment variable | `config/env.ts`, `.env.example`, and this README |
| Change the backend address the frontend uses | `frontend/.env.local` (`NEXT_PUBLIC_API_URL`) |
| Change a page | `frontend/app/<page>/page.tsx` |
