export type CharacterActionState =
  | 'idle'
  | 'walk'
  | 'wave'
  | 'bow'
  | 'standing_pray'
  | 'sitting_down'
  | 'sitting_idle'
  | 'sitting_pray'
  | 'standing_up'
  | 'kneeling_down'
  | 'kneeling_idle'
  | 'kneeling_pray'
  | 'standing_from_kneeling';

export interface ActionStateMeta {
  label: string;
  isSitting: boolean;
  isKneeling: boolean;
  isPraying: boolean;
  isTransition: boolean;
  allowsMovement: boolean;
  duration?: number; // seconds for one-shot or transition actions
}

export const ACTION_STATE_METAS: Record<CharacterActionState, ActionStateMeta> = {
  idle: {
    label: '대기',
    isSitting: false,
    isKneeling: false,
    isPraying: false,
    isTransition: false,
    allowsMovement: true,
  },
  walk: {
    label: '걷기',
    isSitting: false,
    isKneeling: false,
    isPraying: false,
    isTransition: false,
    allowsMovement: true,
  },
  wave: {
    label: '손 흔들기 (인사)',
    isSitting: false,
    isKneeling: false,
    isPraying: false,
    isTransition: true,
    allowsMovement: false,
    duration: 1.8,
  },
  bow: {
    label: '정중한 인사 (경배)',
    isSitting: false,
    isKneeling: false,
    isPraying: false,
    isTransition: true,
    allowsMovement: false,
    duration: 2.0,
  },
  standing_pray: {
    label: '서서 기도',
    isSitting: false,
    isKneeling: false,
    isPraying: true,
    isTransition: false,
    allowsMovement: false,
  },
  sitting_down: {
    label: '의자에 앉는 중',
    isSitting: true,
    isKneeling: false,
    isPraying: false,
    isTransition: true,
    allowsMovement: false,
    duration: 0.7,
  },
  sitting_idle: {
    label: '앉아 있기',
    isSitting: true,
    isKneeling: false,
    isPraying: false,
    isTransition: false,
    allowsMovement: false,
  },
  sitting_pray: {
    label: '앉아서 기도',
    isSitting: true,
    isKneeling: false,
    isPraying: true,
    isTransition: false,
    allowsMovement: false,
  },
  standing_up: {
    label: '일어서는 중',
    isSitting: false,
    isKneeling: false,
    isPraying: false,
    isTransition: true,
    allowsMovement: false,
    duration: 0.6,
  },
  kneeling_down: {
    label: '무릎 꿇는 중',
    isSitting: false,
    isKneeling: true,
    isPraying: false,
    isTransition: true,
    allowsMovement: false,
    duration: 0.75,
  },
  kneeling_idle: {
    label: '무릎 꿇고 대기',
    isSitting: false,
    isKneeling: true,
    isPraying: false,
    isTransition: false,
    allowsMovement: false,
  },
  kneeling_pray: {
    label: '무릎 꿇고 기도',
    isSitting: false,
    isKneeling: true,
    isPraying: true,
    isTransition: false,
    allowsMovement: false,
  },
  standing_from_kneeling: {
    label: '무릎에서 일어서는 중',
    isSitting: false,
    isKneeling: false,
    isPraying: false,
    isTransition: true,
    allowsMovement: false,
    duration: 0.65,
  },
};

export function isSittingState(state: CharacterActionState): boolean {
  return ACTION_STATE_METAS[state].isSitting;
}

export function isKneelingState(state: CharacterActionState): boolean {
  return ACTION_STATE_METAS[state].isKneeling;
}

export function isPrayingState(state: CharacterActionState): boolean {
  return ACTION_STATE_METAS[state].isPraying;
}

export function canCharacterMove(state: CharacterActionState): boolean {
  return ACTION_STATE_METAS[state].allowsMovement;
}
