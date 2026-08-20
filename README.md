# Strava Activity Calendar Sync

Node + Express + EJS app that:
1. Lets a user connect their Strava account via OAuth ("Connect to Strava" button)
2. Shows their own activities on a calendar, synced from Strava (handles the empty state, plus a manual "Sync now" button)
3. Lets you edit an activity from the calendar panel and pushes the edit back to Strava, so it's reflected in the Strava app

## How it maps to the 3 steps

| Step | Where |
|---|---|
| 1 — Connect to Strava button + OAuth | `views/login.ejs`, `routes/auth.js` |
| 2 — Calendar of synced activities, empty state, manual sync | `views/calendar.ejs`, `routes/activities.js` (`/calendar`, `/api/activities.json`), `public/js/calendar.js` |
| 3 — Edit activity → reflects in Strava app | `routes/activities.js` (`PUT /api/activities/:id`) → `utils/strava.js` `updateActivity()` → Strava's `PUT /activities/{id}` |

Only the logged-in athlete's activities are ever shown: Strava's `GET /athlete/activities` endpoint is scoped to whichever access token calls it, and that token lives only in this browser's server-side session — there's no way for the app to fetch anyone else's data.

## Quick Start (Demo Mode vs Real Strava)

### Option A: Instant Demo Mode (No Strava Credentials Needed)
The app includes a built-in `DEMO_MODE` parallel code path in `utils/strava.js` and `routes/auth.js` that simulates Strava's OAuth and REST API with realistic, date-anchored in-memory fixtures.

1. Clone and install dependencies:
   ```bash
   npm install
   ```
2. Start the application (`DEMO_MODE=true` is enabled in `.env` by default):
   ```bash
   npm start
   ```
3. Visit **`http://localhost:3000`**
4. Click **Launch Demo Sync** → instantly opens the calendar populated with simulated activities (Runs, Rides, Hikes, Swims, Workouts).
5. Click any event to open the edit panel, modify fields, and click **Save to Strava** to see live two-way updates.
6. Use the **Toggle Empty State** button in the header to preview the zero-activity empty state (FR2.4) and test the **↻ Sync now** recovery action.

---

### Option B: Real Strava API Mode

#### 1. Create a Strava API application
1. Go to https://www.strava.com/settings/api (log in with your Strava account first).
2. Fill in the form:
   - **Application Name**: anything, e.g. "Activity Sync"
   - **Category**: Other
   - **Website**: `http://localhost:3000`
   - **Authorization Callback Domain**: `localhost` (just the domain, no `http://` or path)
3. Save to get your **Client ID** and **Client Secret**.

#### 2. Configure `.env`
Edit `.env` (or copy from `.env.example`):
```env
DEMO_MODE=false
STRAVA_CLIENT_ID=<your_strava_client_id>
STRAVA_CLIENT_SECRET=<your_strava_client_secret>
STRAVA_REDIRECT_URI=http://localhost:3000/auth/strava/callback
SESSION_SECRET=a_long_random_session_secret
PORT=3000
```

#### 3. Run
```bash
npm start
```
Visit http://localhost:3000, click **Connect to Strava**, and grant permissions (`activity:read_all`, `activity:write`).

---

## Deploying to Vercel

The repository is pre-configured for Vercel deployment with [vercel.json](file:///Users/gokulchowdary/Downloads/strava-calendar/vercel.json) and [api/index.js](file:///Users/gokulchowdary/Downloads/strava-calendar/api/index.js).

### Step 1: Deploy with Vercel CLI or Git

**Option 1 — Using Vercel CLI:**
```bash
npx vercel
```
Follow the prompts (defaults are pre-configured).

**Option 2 — Using GitHub / Vercel Dashboard:**
1. Push this repository to GitHub.
2. Go to **[vercel.com/new](https://vercel.com/new)** and import your repository.
3. Deploy!

### Step 2: Configure Environment Variables in Vercel
In your Vercel Project Dashboard (**Settings** → **Environment Variables**), add:
- `DEMO_MODE`: `true` (or `false` for live Strava OAuth)
- `STRAVA_CLIENT_ID`: `273395`
- `STRAVA_CLIENT_SECRET`: `dae31c8511ce25fb1a8ee4a361f477ecb4753e1e`
- `STRAVA_REDIRECT_URI`: `https://<your-project-name>.vercel.app/auth/strava/callback`
- `SESSION_SECRET`: `any_long_random_secret_string`

### Step 3: Update Strava API Settings (For Live Strava Mode)
In your **[Strava API Settings](https://www.strava.com/settings/api)**:
- Set **Authorization Callback Domain** to your Vercel domain:
  ```
  <your-project-name>.vercel.app
  ```
  *(e.g., `strava-calendar-sync.vercel.app`, no `https://` or path).*

### 4. Get an activity to show up
The calendar is empty until you have at least one Strava activity:
- Easiest: log a manual activity from the Strava website/app (Strava app → "+" → "Add manual activity"), or record a real one with the app: https://play.google.com/store/apps/details?id=com.strava
- Back on the calendar page, click **Sync now** (or just reload — it re-fetches on every load).

### 5. Edit an activity
Click any event on the calendar → edit its name, sport type, description, or trainer/commute flags → **Save to Strava**. Open the Strava app and pull to refresh — the change is there, because the save calls Strava's own `PUT /activities/{id}` endpoint directly; this app doesn't keep a separate copy of the data.

## Notes on scopes
The OAuth request asks for `activity:read_all` (see all your own activities, including private ones) and `activity:write` (required for Step 3's edits). Strava will show both permissions on its consent screen.

## Supported sport types
Strava's full list: https://support.strava.com/hc/en-us/articles/216919407-Supported-Sport-Types-on-Strava — `utils/sportTypes.js` (server, for icons/colors) and `public/js/sportTypes.js` (client, for the edit dropdown) cover the common ones; anything not explicitly listed still displays fine with a generic icon.

## Project structure
```
server.js                  Express app entry point
routes/auth.js              OAuth connect + callback + logout
routes/activities.js        Calendar page, JSON feed, sync, edit (PUT back to Strava)
utils/strava.js             Strava API client (token exchange/refresh, get/update activities)
utils/sportTypes.js         Sport type → icon/color mapping (server-side, for calendar events)
views/login.ejs             Step 1 — Connect to Strava
views/calendar.ejs          Step 2/3 — calendar + edit modal markup
public/js/calendar.js       FullCalendar wiring, sync button, edit modal logic
public/js/sportTypes.js     Sport type list for the edit dropdown
public/css/style.css        Styling
```

## Known limitations (for a take-home scope)
- Tokens are stored in the server-side session (in-memory store by default) — fine for a demo/single user; swap for a DB-backed session store or persisted token table for multiple concurrent users.
- No webhook subscription — sync is pull-based (on page load / manual "Sync now"), not real-time push from Strava.
