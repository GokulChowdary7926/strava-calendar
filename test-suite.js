const assert = require('assert');
const axios = require('axios');
const http = require('http');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🧪 Starting Strava Calendar Sync Integration Tests...\n');

  // Test 1: Landing Page (FR1.1)
  console.log('Test 1: Verify landing page renders');
  const resHome = await axios.get(`${BASE_URL}/`);
  assert.strictEqual(resHome.status, 200);
  assert.ok(resHome.data.includes('Activity Sync'));
  assert.ok(resHome.data.includes('/auth/strava'));
  console.log('✅ Landing page OK\n');

  // Test 2: Access Denied error on landing page (FR1.6)
  console.log('Test 2: Verify access_denied error state message');
  const resDenied = await axios.get(`${BASE_URL}/?error=access_denied`);
  assert.strictEqual(resDenied.status, 200);
  assert.ok(resDenied.data.includes('Connection cancelled — you declined access on Strava'));
  console.log('✅ Access denied message OK\n');

  // Test 3: OAuth flow (FR1.2, FR1.3, FR1.4)
  console.log('Test 3: OAuth redirect and callback');
  const authRes = await axios.get(`${BASE_URL}/auth/strava`, { maxRedirects: 0, validateStatus: null });
  assert.strictEqual(authRes.status, 302);
  const redirectLocation = authRes.headers.location;
  assert.ok(redirectLocation.includes('strava.com/oauth/authorize') || redirectLocation.includes('/auth/strava/callback'));

  const callbackRes = await axios.get(`${BASE_URL}/auth/strava/callback?code=test_code`, { maxRedirects: 0, validateStatus: null });
  assert.strictEqual(callbackRes.status, 302);
  const cookie = callbackRes.headers['set-cookie'] ? callbackRes.headers['set-cookie'][0].split(';')[0] : '';
  console.log('✅ OAuth flow verified\n');

  const authHeaders = { headers: { Cookie: cookie } };

  // Test 4: Calendar Page Load & EJS rendering (FR2.1, FR2.2, FR2.6)
  console.log('Test 4: Calendar page authentication & HTML rendering');
  const calendarRes = await axios.get(`${BASE_URL}/calendar`, authHeaders);
  assert.strictEqual(calendarRes.status, 200);
  assert.ok(calendarRes.data.includes('id="calendar"') || calendarRes.data.includes('empty-state'));
  console.log('✅ Calendar page OK\n');

  // Test 5: API Activities JSON Feed (FR2.1, FR2.3)
  console.log('Test 5: Fetch activities JSON feed');
  const activitiesRes = await axios.get(`${BASE_URL}/api/activities.json`, authHeaders);
  assert.strictEqual(activitiesRes.status, 200);
  assert.ok(Array.isArray(activitiesRes.data.events));
  assert.ok(activitiesRes.data.events.length > 0);
  const firstEvent = activitiesRes.data.events[0];
  assert.ok(firstEvent.id);
  assert.ok(firstEvent.title);
  assert.ok(firstEvent.color);
  assert.ok(firstEvent.extendedProps.sport_type);
  assert.ok(firstEvent.extendedProps.strava_url);
  console.log(`✅ Activities feed OK (${activitiesRes.data.events.length} events loaded)\n`);

  // Test 6: Edit Activity via PUT (FR3.1, FR3.2, FR3.3)
  console.log('Test 6: Update activity via PUT /api/activities/:id');
  const targetId = firstEvent.id;
  const updatePayload = {
    name: 'Trail Tempo Run - Speed Session',
    sport_type: 'TrailRun',
    description: '4x1km hills in forest trails',
    trainer: false,
    commute: true,
  };
  const updateRes = await axios.put(`${BASE_URL}/api/activities/${targetId}`, updatePayload, authHeaders);
  assert.strictEqual(updateRes.status, 200);
  assert.strictEqual(updateRes.data.ok, true);
  assert.ok(updateRes.data.event.title.includes('Trail Tempo Run - Speed Session'));
  assert.strictEqual(updateRes.data.event.extendedProps.sport_type, 'TrailRun');
  assert.strictEqual(updateRes.data.event.extendedProps.commute, true);
  console.log('✅ Activity update OK\n');

  // Test 7: Verify Persistence / Two-Way reflect in GET /api/activities.json
  console.log('Test 7: Verify updated event in subsequent JSON sync');
  const reSyncRes = await axios.get(`${BASE_URL}/api/activities.json`, authHeaders);
  const updatedEvent = reSyncRes.data.events.find(e => e.id === targetId);
  assert.ok(updatedEvent);
  assert.ok(updatedEvent.title.includes('Trail Tempo Run - Speed Session'));
  assert.strictEqual(updatedEvent.extendedProps.description, '4x1km hills in forest trails');
  console.log('✅ Persistence and two-way sync OK\n');

  // Test 8: Empty State Verification (FR2.4)
  console.log('Test 8: Verify empty state handling');
  await axios.post(`${BASE_URL}/api/demo/toggle-empty`, { empty: true }, authHeaders);
  const emptyJson = await axios.get(`${BASE_URL}/api/activities.json`, authHeaders);
  assert.strictEqual(emptyJson.data.events.length, 0);

  // Repopulate
  await axios.post(`${BASE_URL}/api/demo/toggle-empty`, { empty: false }, authHeaders);
  const repopulatedJson = await axios.get(`${BASE_URL}/api/activities.json`, authHeaders);
  assert.ok(repopulatedJson.data.events.length > 0);
  console.log('✅ Empty state & recovery sync OK\n');

  // Test 9: Unauthenticated Access Guard
  console.log('Test 9: Verify protected routes redirect unauthenticated users');
  const unauthCal = await axios.get(`${BASE_URL}/calendar`, { maxRedirects: 0, validateStatus: null });
  assert.strictEqual(unauthCal.status, 302);
  assert.strictEqual(unauthCal.headers.location, '/');
  console.log('✅ Protected routes guard OK\n');

  console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
