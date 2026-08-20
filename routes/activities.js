const express = require('express');
const router = express.Router();
const strava = require('../utils/strava');
const { sportMeta } = require('../utils/sportTypes');

// Every route in this file requires a logged-in Strava session.
function requireAuth(req, res, next) {
  if (!req.session.stravaTokens) return res.redirect('/');
  next();
}
router.use(requireAuth);

// Refresh the access token if needed and keep the session bundle in sync.
async function getValidAccessToken(req) {
  const { accessToken, tokenBundle } = await strava.ensureFreshToken(req.session.stravaTokens);
  req.session.stravaTokens = tokenBundle;
  return accessToken;
}

function toCalendarEvent(activity) {
  const meta = sportMeta(activity.sport_type || activity.type);
  const startMs = new Date(activity.start_date_local).getTime();
  const durationMs = (activity.elapsed_time || 0) * 1000;
  return {
    id: activity.id,
    title: `${meta.icon} ${activity.name}`,
    start: new Date(startMs).toISOString(),
    end: new Date(startMs + durationMs).toISOString(),
    color: meta.color,
    extendedProps: {
      sport_type: activity.sport_type || activity.type,
      icon: meta.icon,
      distance_km: activity.distance ? (activity.distance / 1000).toFixed(2) : null,
      moving_time_min: activity.moving_time ? Math.round(activity.moving_time / 60) : null,
      elevation_gain_m: activity.total_elevation_gain ?? null,
      description: activity.description || '',
      trainer: !!activity.trainer,
      commute: !!activity.commute,
      strava_url: `https://www.strava.com/activities/${activity.id}`,
    },
  };
}

// Step 2: calendar page. Handles the "no activities yet" empty state via EJS.
router.get(['/calendar', '/activities'], async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req);
    const activities = await strava.getAllActivities(accessToken);
    res.render('calendar', {
      athlete: req.session.athlete,
      hasActivities: activities.length > 0,
      activityCount: activities.length,
      isDemoMode: strava.isDemoMode(),
      error: null,
    });
  } catch (err) {
    console.error('Failed to load activities:', err.response?.data || err.message);
    res.render('calendar', {
      athlete: req.session.athlete,
      hasActivities: false,
      activityCount: 0,
      isDemoMode: strava.isDemoMode(),
      error: 'Could not reach Strava. Try Sync Now in a moment.',
    });
  }
});

// JSON feed the calendar UI fetches (also doubles as the "manual sync" endpoint).
router.get(['/api/activities.json', '/api/activities'], async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req);
    const activities = await strava.getAllActivities(accessToken);
    res.json({ events: activities.map(toCalendarEvent) });
  } catch (err) {
    console.error('Sync failed:', err.response?.data || err.message);
    res.status(502).json({ error: 'Sync with Strava failed. Please try again.' });
  }
});

// Demo mode fixture toggles (empty state vs populated state)
router.post('/api/demo/toggle-empty', (req, res) => {
  if (!strava.isDemoMode()) {
    return res.status(403).json({ error: 'Demo mode is not enabled' });
  }
  const { empty } = req.body;
  strava.resetDemoStore(!!empty);
  res.json({ ok: true, empty: !!empty });
});

// Step 3: edit an activity from the panel — pushes straight back to Strava via PUT /activities/{id},
// so the change shows up in the Strava app immediately (Strava is the source of truth; we don't
// keep a separate copy that could drift).
router.put('/api/activities/:id', async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req);
    const { name, sport_type, description, trainer, commute } = req.body;
    const updated = await strava.updateActivity(accessToken, req.params.id, {
      name,
      sport_type,
      description,
      trainer: trainer === true || trainer === 'true',
      commute: commute === true || commute === 'true',
    });
    res.json({ ok: true, event: toCalendarEvent(updated) });
  } catch (err) {
    console.error('Update failed:', err.response?.data || err.message);
    res.status(502).json({ ok: false, error: 'Strava rejected the update. Please try again.' });
  }
});

// Create a new activity directly (e.g. from the app when empty or adding manual workouts)
router.post('/api/activities', async (req, res) => {
  try {
    const accessToken = await getValidAccessToken(req);
    const created = await strava.createActivity(accessToken, req.body);
    res.status(201).json({ ok: true, event: toCalendarEvent(created) });
  } catch (err) {
    console.error('Create activity failed:', err.response?.data || err.message);
    res.status(502).json({ ok: false, error: err.response?.data?.message || 'Strava rejected creating the activity.' });
  }
});

module.exports = router;
