import type { PresenterType } from './presenter'

export type PersonaConfig = {
  modeLabel: string
  transcriptLabel: string
  queueLabel: string
  participantModeLabel: string
  graphLabel: string
}

const personaConfigs: Record<PresenterType, PersonaConfig> = {
  educator_trainer: {
    modeLabel: 'Educator Mode',
    transcriptLabel: 'Live Transcript',
    queueLabel: 'Student Queue',
    participantModeLabel: 'Student Mode',
    graphLabel: 'Causal Concept Graph',
  },
  minister_pastor: {
    modeLabel: 'Minister Mode',
    transcriptLabel: 'Sermon Transcript',
    queueLabel: 'Congregation Queue',
    participantModeLabel: 'Attendee Mode',
    graphLabel: 'Doctrinal Concept Graph',
  },
  persuader_pitch: {
    modeLabel: 'Pitch Mode',
    transcriptLabel: 'Pitch Transcript',
    queueLabel: 'Investor Objections',
    participantModeLabel: 'Investor Mode',
    graphLabel: 'Business Concept Graph',
  },
  advocate: {
    modeLabel: 'Advocate Mode',
    transcriptLabel: 'Advocacy Transcript',
    queueLabel: 'Supporter Queue',
    participantModeLabel: 'Supporter Mode',
    graphLabel: 'Policy Concept Graph',
  },
  keynote_motivator: {
    modeLabel: 'Keynote Mode',
    transcriptLabel: 'Keynote Transcript',
    queueLabel: 'Audience Queue',
    participantModeLabel: 'Audience Mode',
    graphLabel: 'Theme Graph',
  },
}

export function getPersonaConfig(presenterType?: PresenterType): PersonaConfig {
  return personaConfigs[presenterType ?? 'educator_trainer']
}
