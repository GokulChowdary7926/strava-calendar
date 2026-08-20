const axios = require('axios');

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

const isDemoMode = () => process.env.DEMO_MODE === 'true';

// In-memory demo fixture store initialized relative to current date
function generateDemoActivities() {
  const now = new Date();
  const getIso = (daysAgo, hour = 7, min = 30) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, min, 0, 0);
    return d.toISOString();
  };

  return [
    {
      id: 1001,
      name: 'Morning Interval Run ⚡',
      sport_type: 'Run',
      type: 'Run',
      start_date_local: getIso(1, 6, 45),
      elapsed_time: 3240, // 54 min
      moving_time: 3120, // 52 min
      distance: 10240, // 10.24 km
      total_elevation_gain: 85,
      description: 'Tempo run along the riverside trail. Felt strong on the intervals!',
      trainer: false,
      commute: false,
    },
    {
      id: 1002,
      name: 'Coastal Road Cycling 🚴‍♂️',
      sport_type: 'Ride',
      type: 'Ride',
      start_date_local: getIso(2, 8, 15),
      elapsed_time: 5760, // 96 min
      moving_time: 5400, // 90 min
      distance: 42800, // 42.8 km
      total_elevation_gain: 410,
      description: 'Weekend endurance loop with headwinds on the way back.',
      trainer: false,
      commute: false,
    },
    {
      id: 1003,
      name: 'Sunset Trail Hike 🥾',
      sport_type: 'Hike',
      type: 'Hike',
      start_date_local: getIso(4, 17, 30),
      elapsed_time: 6800,
      moving_time: 6100,
      distance: 7500,
      total_elevation_gain: 320,
      description: 'Scenic ridge hike watching the golden hour.',
      trainer: false,
      commute: false,
    },
    {
      id: 1004,
      name: 'Indoor Turbo Trainer Session 🌀',
      sport_type: 'VirtualRide',
      type: 'VirtualRide',
      start_date_local: getIso(6, 19, 0),
      elapsed_time: 2700,
      moving_time: 2700,
      distance: 21500,
      total_elevation_gain: 150,
      description: 'Zwift group ride workout ladder.',
      trainer: true,
      commute: false,
    },
    {
      id: 1005,
      name: 'Morning Pool Laps 🏊',
      sport_type: 'Swim',
      type: 'Swim',
      start_date_local: getIso(8, 7, 0),
      elapsed_time: 2400,
      moving_time: 2100,
      distance: 2000,
      total_elevation_gain: 0,
      description: '4x500m endurance sets with drill intervals.',
      trainer: false,
      commute: false,
    },
    {
      id: 1006,
      name: 'Core & Upper Body Strength 💪',
      sport_type: 'WeightTraining',
      type: 'WeightTraining',
      start_date_local: getIso(11, 18, 15),
      elapsed_time: 3600,
      moving_time: 3000,
      distance: 0,
      total_elevation_gain: 0,
      description: 'Compound lifts + 15 min core circuit.',
      trainer: true,
      commute: false,
    },
    {
      id: 1007,
      name: 'Commute by Bike 🚲',
      sport_type: 'Ride',
      type: 'Ride',
      start_date_local: getIso(13, 8, 0),
      elapsed_time: 1500,
      moving_time: 1350,
      distance: 8200,
      total_elevation_gain: 45,
      description: 'Quick morning commute to office.',
      trainer: false,
      commute: true,
    },
  ];
}

let demoStore = {
  athlete: {
    id: 99999999,
    firstname: 'Alex',
    lastname: 'Rivera',
    profile_medium: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  },
  activities: generateDemoActivities(),
};

function getClientId() {
  const raw = (process.env.STRAVA_CLIENT_ID || '').trim();
  const num = parseInt(raw, 10);
  return isNaN(num) ? raw : num;
}

function getClientSecret() {
  return (process.env.STRAVA_CLIENT_SECRET || '').trim();
}

/**
 * Build the URL that sends the user to Strava's consent screen.
 * scope: activity:read_all -> read all of the athlete's own activities (incl. private)
 *        activity:write    -> required so edits made in our panel can be pushed back to Strava
 */
function getAuthorizeUrl() {
  if (isDemoMode()) {
    return '/auth/strava/callback?code=demo_auth_code';
  }
  const params = new URLSearchParams({
    client_id: String(getClientId()),
    redirect_uri: (process.env.STRAVA_REDIRECT_URI || 'http://localhost:3000/auth/strava/callback').trim(),
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all,activity:write',
  });
  return `${STRAVA_AUTH_URL}?${params.toString()}`;
}

/** Exchange the one-time ?code=... from the OAuth redirect for access/refresh tokens. */
async function exchangeCodeForToken(code) {
  if (isDemoMode()) {
    return {
      token_type: 'Bearer',
      access_token: 'demo_access_token_' + Date.now(),
      refresh_token: 'demo_refresh_token_xyz',
      expires_at: Math.floor(Date.now() / 1000) + 21600, // +6 hrs
      expires_in: 21600,
      athlete: demoStore.athlete,
    };
  }

  const { data } = await axios.post(STRAVA_TOKEN_URL, {
    client_id: getClientId(),
    client_secret: getClientSecret(),
    code: String(code).trim(),
    grant_type: 'authorization_code',
  });
  return data;
}

/** Strava access tokens expire after 6 hours — refresh_token is long-lived. */
async function refreshAccessToken(refreshToken) {
  if (isDemoMode()) {
    return {
      token_type: 'Bearer',
      access_token: 'demo_refreshed_access_token_' + Date.now(),
      refresh_token: refreshToken,
      expires_at: Math.floor(Date.now() / 1000) + 21600,
      expires_in: 21600,
    };
  }

  const { data } = await axios.post(STRAVA_TOKEN_URL, {
    client_id: getClientId(),
    client_secret: getClientSecret(),
    refresh_token: String(refreshToken).trim(),
    grant_type: 'refresh_token',
  });
  return data;
}

/**
 * Given the session's token bundle, return a valid access token —
 * transparently refreshing it first if it has expired.
 * Returns { accessToken, tokenBundle } where tokenBundle should be re-saved to the session
 * if it changed.
 */
async function ensureFreshToken(tokenBundle) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (tokenBundle.expires_at && tokenBundle.expires_at - 60 > nowSeconds) {
    return { accessToken: tokenBundle.access_token, tokenBundle };
  }
  const refreshed = await refreshAccessToken(tokenBundle.refresh_token);
  const merged = { ...tokenBundle, ...refreshed };
  return { accessToken: merged.access_token, tokenBundle: merged };
}

/**
 * GET /athlete/activities is inherently scoped to the authenticated athlete only —
 * Strava's API has no way to request another user's activities with this token,
 * so "only the logged-in person's activities" is guaranteed by the API itself.
 */
async function getAllActivities(accessToken, { after, before } = {}) {
  if (isDemoMode()) {
    return [...demoStore.activities];
  }

  const perPage = 100;
  let page = 1;
  let all = [];

  while (true) {
    const { data } = await axios.get(`${STRAVA_API_BASE}/athlete/activities`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { per_page: perPage, page, after, before },
    });
    all = all.concat(data);
    if (data.length < perPage) break;
    page += 1;
    if (page > 10) break; // safety cap (1000 activities) for a demo app
  }
  return all;
}

async function getAthlete(accessToken) {
  if (isDemoMode()) {
    return demoStore.athlete;
  }
  const { data } = await axios.get(`${STRAVA_API_BASE}/athlete`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

/**
 * Push an edit back to Strava. Strava's PUT /activities/{id} only accepts a specific
 * whitelist of updatable fields — this is the same set the Strava app itself lets you edit.
 */
async function updateActivity(accessToken, activityId, fields) {
  const allowed = ['name', 'type', 'sport_type', 'description', 'trainer', 'commute', 'gear_id'];
  const body = {};
  for (const key of allowed) {
    if (fields[key] !== undefined && fields[key] !== '') body[key] = fields[key];
  }

  if (isDemoMode()) {
    const idNum = Number(activityId);
    const item = demoStore.activities.find((a) => a.id === idNum || String(a.id) === String(activityId));
    if (!item) {
      const err = new Error('Activity not found in demo fixture');
      err.response = { status: 404, data: { message: 'Not Found' } };
      throw err;
    }
    Object.assign(item, body);
    if (body.sport_type && !body.type) item.type = body.sport_type;
    return { ...item };
  }

  const { data } = await axios.put(`${STRAVA_API_BASE}/activities/${activityId}`, body, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

/**
 * Create a new manual activity on Strava.
 * POST /activities
 */
async function createActivity(accessToken, fields) {
  const allowed = ['name', 'type', 'sport_type', 'start_date_local', 'elapsed_time', 'distance', 'description', 'trainer', 'commute'];
  const body = {};
  for (const key of allowed) {
    if (fields[key] !== undefined && fields[key] !== '') body[key] = fields[key];
  }
  if (!body.start_date_local) body.start_date_local = new Date().toISOString();
  if (!body.elapsed_time) body.elapsed_time = 1800; // 30 min default
  if (!body.sport_type) body.sport_type = 'Run';
  if (!body.type) body.type = body.sport_type;

  if (isDemoMode()) {
    const newActivity = {
      id: Date.now(),
      name: body.name || 'Manual Activity',
      sport_type: body.sport_type,
      type: body.sport_type,
      start_date_local: body.start_date_local,
      elapsed_time: Number(body.elapsed_time),
      moving_time: Number(body.elapsed_time),
      distance: Number(body.distance) || 5000,
      total_elevation_gain: 50,
      description: body.description || '',
      trainer: !!body.trainer,
      commute: !!body.commute,
    };
    demoStore.activities.unshift(newActivity);
    return newActivity;
  }

  const { data } = await axios.post(`${STRAVA_API_BASE}/activities`, body, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

/** Demo helper to reset or clear demo fixture (for testing empty vs populated states) */
function resetDemoStore(empty = false) {
  demoStore.activities = empty ? [] : generateDemoActivities();
}

module.exports = {
  isDemoMode,
  getAuthorizeUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  ensureFreshToken,
  getAllActivities,
  getAthlete,
  updateActivity,
  createActivity,
  resetDemoStore,
};

