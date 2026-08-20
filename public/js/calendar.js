document.addEventListener('DOMContentLoaded', () => {
  const calendarEl = document.getElementById('calendar');
  const emptyState = document.getElementById('emptyState');
  const calendarWrap = document.getElementById('calendarWrap');
  const syncBtn = document.getElementById('syncBtn');
  const emptyStateSyncBtn = document.getElementById('emptyStateSyncBtn');
  const addActivityBtn = document.getElementById('addActivityBtn');
  const emptyStateAddBtn = document.getElementById('emptyStateAddBtn');

  const modal = document.getElementById('editModal');
  const editForm = document.getElementById('editForm');
  const modalError = document.getElementById('modalError');
  const editSportType = document.getElementById('editSportType');
  const statGrid = document.getElementById('statGrid');
  const viewOnStrava = document.getElementById('viewOnStrava');
  const modalSave = document.getElementById('modalSave');

  let calendar;

  function populateSportTypeOptions(selectEl, selectedValue = 'Run') {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    const groups = typeof SPORT_TYPE_GROUPS !== 'undefined' ? SPORT_TYPE_GROUPS : {
      'Run': ['Run', 'TrailRun', 'Treadmill'],
      'Ride': ['Ride', 'MountainBikeRide', 'GravelRide', 'EBikeRide', 'VirtualRide'],
      'Walk / Hike': ['Walk', 'Hike'],
      'Water': ['Swim', 'Rowing', 'Kayaking', 'Canoeing', 'StandUpPaddling'],
      'Winter': ['AlpineSki', 'BackcountrySki', 'NordicSki', 'Snowboard', 'IceSkate'],
      'Fitness': ['WeightTraining', 'Workout', 'Crossfit', 'Elliptical', 'StairStepper', 'Yoga'],
      'Sport': ['Golf', 'Tennis', 'Soccer', 'Basketball', 'RockClimbing'],
      'Other': ['Skateboard', 'InlineSkate', 'Wheelchair', 'HandCycle', 'Velomobile'],
    };

    Object.entries(groups).forEach(([groupLabel, types]) => {
      const group = document.createElement('optgroup');
      group.label = groupLabel;
      types.forEach((t) => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t.replace(/([a-z])([A-Z])/g, '$1 $2');
        if (t === selectedValue) opt.selected = true;
        group.appendChild(opt);
      });
      selectEl.appendChild(group);
    });
  }

  // Pre-populate sport types immediately so dropdown is never empty
  populateSportTypeOptions(editSportType, 'Run');

  function renderStats(props = {}) {
    if (!statGrid) return;
    if (!props.distance_km && !props.moving_time_min && props.elevation_gain_m == null) {
      statGrid.innerHTML = '';
      statGrid.style.display = 'none';
      return;
    }
    statGrid.style.display = 'grid';
    const stats = [
      ['Distance', props.distance_km ? `${props.distance_km} km` : '—'],
      ['Moving time', props.moving_time_min ? `${props.moving_time_min} min` : '—'],
      ['Elevation gain', props.elevation_gain_m != null ? `${Math.round(props.elevation_gain_m)} m` : '—'],
    ];
    statGrid.innerHTML = stats
      .map(([label, value]) => `<div class="stat"><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`)
      .join('');
  }

  function openEditModal(event) {
    const props = event.extendedProps || {};
    document.getElementById('modalIcon').textContent = `${props.icon || '⚡'} Edit activity`;
    document.getElementById('editId').value = event.id;
    document.getElementById('editName').value = event.title.replace(/^\S+\s/, ''); // strip leading icon
    populateSportTypeOptions(editSportType, props.sport_type || 'Run');
    document.getElementById('editDescription').value = props.description || '';
    document.getElementById('editTrainer').checked = !!props.trainer;
    document.getElementById('editCommute').checked = !!props.commute;
    
    if (viewOnStrava) {
      viewOnStrava.style.display = 'inline-flex';
      viewOnStrava.href = props.strava_url || `https://www.strava.com/activities/${event.id}`;
    }
    if (modalSave) modalSave.textContent = 'Save to Strava';
    
    renderStats(props);
    modalError.hidden = true;
    modal.hidden = false;
    modal.classList.remove('is-hidden');
  }

  function openCreateModal() {
    document.getElementById('modalIcon').textContent = `⚡ Log new activity`;
    document.getElementById('editId').value = '';
    document.getElementById('editName').value = '';
    populateSportTypeOptions(editSportType, 'Run');
    document.getElementById('editDescription').value = '';
    document.getElementById('editTrainer').checked = false;
    document.getElementById('editCommute').checked = false;
    
    if (viewOnStrava) viewOnStrava.style.display = 'none';
    if (modalSave) modalSave.textContent = 'Create in Strava';
    
    renderStats({});
    modalError.hidden = true;
    modal.hidden = false;
    modal.classList.remove('is-hidden');
  }

  function closeModal() {
    modal.hidden = true;
    modal.classList.add('is-hidden');
  }

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  if (addActivityBtn) addActivityBtn.addEventListener('click', openCreateModal);
  if (emptyStateAddBtn) emptyStateAddBtn.addEventListener('click', openCreateModal);

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value.trim();
    const isNew = !id;

    modalSave.disabled = true;
    modalSave.textContent = isNew ? 'Creating…' : 'Saving…';
    modalError.hidden = true;

    const payload = {
      name: document.getElementById('editName').value.trim() || 'Activity',
      sport_type: editSportType.value,
      description: document.getElementById('editDescription').value,
      trainer: document.getElementById('editTrainer').checked,
      commute: document.getElementById('editCommute').checked,
    };

    try {
      const url = isNew ? '/api/activities' : `/api/activities/${id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Operation failed');

      if (isNew) {
        calendar.addEvent(data.event);
        emptyState.style.display = 'none';
        calendarWrap.style.display = 'block';
      } else {
        const existing = calendar.getEventById(id);
        if (existing) existing.remove();
        calendar.addEvent(data.event);
      }

      closeModal();
    } catch (err) {
      modalError.textContent = err.message || 'Could not reach Strava. Please try again.';
      modalError.hidden = false;
    } finally {
      modalSave.disabled = false;
      modalSave.textContent = isNew ? 'Create in Strava' : 'Save to Strava';
    }
  });

  async function loadEvents(fetchInfo, successCallback, failureCallback) {
    try {
      const res = await fetch('/api/activities.json');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');

      if (data.events.length === 0) {
        emptyState.style.display = 'flex';
        calendarWrap.style.display = 'none';
      } else {
        emptyState.style.display = 'none';
        calendarWrap.style.display = 'block';
      }
      successCallback(data.events);
    } catch (err) {
      failureCallback(err);
    }
  }

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek,listMonth',
    },
    events: loadEvents,
    eventClick: (info) => openEditModal(info.event),
    eventDisplay: 'block',
  });
  calendar.render();

  async function manualSync() {
    const btns = [syncBtn, emptyStateSyncBtn].filter(Boolean);
    btns.forEach((b) => {
      b.disabled = true;
      b.dataset.originalText = b.textContent;
      b.textContent = 'Syncing…';
    });
    calendar.refetchEvents();
    setTimeout(() => {
      btns.forEach((b) => {
        b.disabled = false;
        b.textContent = b.dataset.originalText;
      });
    }, 900);
  }

  const toggleEmptyDemoBtn = document.getElementById('toggleEmptyDemoBtn');
  let isCurrentlyEmpty = false;

  if (toggleEmptyDemoBtn) {
    toggleEmptyDemoBtn.addEventListener('click', async () => {
      isCurrentlyEmpty = !isCurrentlyEmpty;
      toggleEmptyDemoBtn.disabled = true;
      try {
        await fetch('/api/demo/toggle-empty', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ empty: isCurrentlyEmpty }),
        });
        toggleEmptyDemoBtn.textContent = isCurrentlyEmpty ? 'Populate Demo Data' : 'Empty State Test';
        calendar.refetchEvents();
      } catch (e) {
        console.error('Failed to toggle demo empty state', e);
      } finally {
        toggleEmptyDemoBtn.disabled = false;
      }
    });
  }

  syncBtn.addEventListener('click', manualSync);
  if (emptyStateSyncBtn) {
    emptyStateSyncBtn.addEventListener('click', async () => {
      if (toggleEmptyDemoBtn && isCurrentlyEmpty) {
        isCurrentlyEmpty = false;
        await fetch('/api/demo/toggle-empty', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ empty: false }),
        });
        toggleEmptyDemoBtn.textContent = 'Empty State Test';
      }
      manualSync();
    });
  }
});

