export const presenterTypes = [
  'educator_trainer',
  'persuader_pitch',
  'advocate',
  'minister_pastor',
  'keynote_motivator',
] as const

export type PresenterType = (typeof presenterTypes)[number]

export const presenterLabels: Record<PresenterType, string> = {
  educator_trainer: 'Educator / Trainer',
  persuader_pitch: 'Persuader / Pitch',
  advocate: 'Advocate',
  minister_pastor: 'Minister / Pastor',
  keynote_motivator: 'Keynote / Motivator',
}
