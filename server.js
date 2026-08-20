require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const activityRoutes = require('./routes/activities');

const app = express();

// Support views in both standard node and Vercel serverless environments
const viewsPath = path.join(__dirname, 'views');
app.set('view engine', 'ejs');
app.set('views', viewsPath);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day
  })
);

const { isDemoMode } = require('./utils/strava');

// Step 1: login/connect page
app.get('/', (req, res) => {
  if (req.session.stravaTokens) return res.redirect('/calendar');
  res.render('login', {
    error: req.query.error || null,
    isDemoMode: isDemoMode(),
  });
});

app.use('/auth', authRoutes);
app.use('/', activityRoutes);

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Strava calendar sync running at http://localhost:${PORT}`);
  });
}

module.exports = app;
