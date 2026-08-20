// Client-side mirror of Strava's supported sport types, grouped for the edit dropdown.
// See: https://support.strava.com/hc/en-us/articles/216919407
const SPORT_TYPE_GROUPS = {
  'Run': ['Run', 'TrailRun', 'Treadmill'],
  'Ride': ['Ride', 'MountainBikeRide', 'GravelRide', 'EBikeRide', 'VirtualRide'],
  'Walk / Hike': ['Walk', 'Hike'],
  'Water': ['Swim', 'Rowing', 'Kayaking', 'Canoeing', 'StandUpPaddling'],
  'Winter': ['AlpineSki', 'BackcountrySki', 'NordicSki', 'Snowboard', 'IceSkate'],
  'Fitness': ['WeightTraining', 'Workout', 'Crossfit', 'Elliptical', 'StairStepper', 'Yoga'],
  'Sport': ['Golf', 'Tennis', 'Soccer', 'Basketball', 'RockClimbing'],
  'Other': ['Skateboard', 'InlineSkate', 'Wheelchair', 'HandCycle', 'Velomobile'],
};
