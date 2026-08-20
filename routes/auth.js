const express = require('express');
const router = express.Router();
const strava = require('../utils/strava');

// Step 1: "Connect to Strava" button posts here, we redirect to Strava's consent screen
router.get('/strava', (req, res) => {
  res.redirect(strava.getAuthorizeUrl());
});

// Strava redirects the browser back here with ?code=... (or ?error=access_denied)
router.get('/strava/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    // e.g. user clicked "Cancel" on Strava's consent screen
    return res.redirect('/?error=' + encodeURIComponent(error));
  }

  try {
    const tokenBundle = await strava.exchangeCodeForToken(code);
    // Store the whole bundle (access_token, refresh_token, expires_at, athlete) in the session.
    // Everything downstream reads from req.session, so only this browser's session ever sees
    // this athlete's tokens or activities.
    req.session.stravaTokens = {
      access_token: tokenBundle.access_token,
      refresh_token: tokenBundle.refresh_token,
      expires_at: tokenBundle.expires_at,
    };
    req.session.athlete = tokenBundle.athlete;
    res.redirect('/calendar');
  } catch (err) {
    console.error('OAuth exchange failed:', err.response?.data || err.message);
    res.redirect('/?error=oauth_failed');
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
