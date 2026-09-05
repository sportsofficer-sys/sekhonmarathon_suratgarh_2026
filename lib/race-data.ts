// Planned station prices. Confirm procurement and payment settings before opening.
export const RACE_FEES: Record<string, number> = {
  '5': 600,
  '10': 700,
  '21': 800,
};
export const RACES = [
  {
    distance: '5',
    name: 'Fun Run',
    fee: 600,
    description:
      'A welcoming start for new runners and families. Find your pace and enjoy the morning together.',
    label: 'START TOGETHER',
    detail: 'Run or walk · Family friendly',
  },
  {
    distance: '10',
    name: 'Challenge Run',
    fee: 700,
    description:
      'For regular runners ready to go a little further. Set yourself a goal and make every kilometre count.',
    label: 'BUILD YOUR DISTANCE',
    detail: 'For regular runners',
  },
  {
    distance: '21',
    name: 'Half Marathon',
    fee: 800,
    description:
      'A rewarding endurance challenge for prepared runners. Bring your training to the start line.',
    label: 'GO THE DISTANCE',
    detail: 'For trained distance runners',
  },
];
