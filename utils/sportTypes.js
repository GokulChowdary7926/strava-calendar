// Maps Strava sport_type values to a display icon + color accent.
// Not exhaustive of every niche type Strava supports, but covers the common ones;
// anything unmatched falls back to a generic "activity" icon so nothing breaks.
const SPORT_META = {
  Run: { icon: '🏃', color: '#FC4C02' },
  TrailRun: { icon: '🏃‍♂️', color: '#FC4C02' },
  Treadmill: { icon: '🏃', color: '#FC4C02' },
  Ride: { icon: '🚴', color: '#2A9D8F' },
  MountainBikeRide: { icon: '🚵', color: '#2A9D8F' },
  GravelRide: { icon: '🚴‍♀️', color: '#2A9D8F' },
  EBikeRide: { icon: '🚴‍♂️', color: '#2A9D8F' },
  VirtualRide: { icon: '🚴', color: '#2A9D8F' },
  Hike: { icon: '🥾', color: '#8D6E63' },
  Walk: { icon: '🚶', color: '#8D6E63' },
  Swim: { icon: '🏊', color: '#219EBC' },
  Yoga: { icon: '🧘', color: '#9C6ADE' },
  WeightTraining: { icon: '🏋️', color: '#6B7280' },
  Workout: { icon: '💪', color: '#6B7280' },
  Crossfit: { icon: '🔥', color: '#EF4444' },
  Elliptical: { icon: '🌀', color: '#6B7280' },
  StairStepper: { icon: '🪜', color: '#6B7280' },
  Rowing: { icon: '🚣', color: '#219EBC' },
  Kayaking: { icon: '🛶', color: '#219EBC' },
  Canoeing: { icon: '🛶', color: '#219EBC' },
  StandUpPaddling: { icon: '🏄', color: '#219EBC' },
  AlpineSki: { icon: '⛷️', color: '#3B82F6' },
  BackcountrySki: { icon: '⛷️', color: '#3B82F6' },
  NordicSki: { icon: '🎿', color: '#3B82F6' },
  Snowboard: { icon: '🏂', color: '#3B82F6' },
  IceSkate: { icon: '⛸️', color: '#3B82F6' },
  Golf: { icon: '⛳', color: '#65A30D' },
  Tennis: { icon: '🎾', color: '#84CC16' },
  Soccer: { icon: '⚽', color: '#84CC16' },
  Basketball: { icon: '🏀', color: '#EA580C' },
  RockClimbing: { icon: '🧗', color: '#8D6E63' },
  Skateboard: { icon: '🛹', color: '#6B7280' },
  InlineSkate: { icon: '⛸️', color: '#6B7280' },
  Wheelchair: { icon: '🧑‍🦽', color: '#6B7280' },
  HandCycle: { icon: '🚲', color: '#2A9D8F' },
  Velomobile: { icon: '🚲', color: '#2A9D8F' },
};

function sportMeta(sportType) {
  return SPORT_META[sportType] || { icon: '⚡', color: '#FC4C02' };
}

module.exports = { SPORT_META, sportMeta };
