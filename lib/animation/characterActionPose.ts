import { CharacterActionState } from './actionTypes';

export interface ActionPoseRotations {
  // 메쉬 Y 위치 오프셋 (앉기 시 +0.16m, 무릎 꿇기 시 -0.22m)
  meshOffsetY: number;

  // 다리 관절 [x, y, z]
  leftThigh: [number, number, number];
  rightThigh: [number, number, number];
  leftKnee: [number, number, number];
  rightKnee: [number, number, number];
  leftFoot: [number, number, number];
  rightFoot: [number, number, number];

  // 팔 관절 [x, y, z]
  leftArm: [number, number, number];
  rightArm: [number, number, number];
  leftForearm: [number, number, number];
  rightForearm: [number, number, number];

  // 척추 및 머리
  hips: [number, number, number];
  spine: [number, number, number];
  spine1: [number, number, number];
  spine2: [number, number, number];
  neck: [number, number, number];
  head: [number, number, number];

  // 기도 중 여부 (눈 감김 효과 연동)
  isPraying: boolean;
}

function smoothstep(min: number, max: number, val: number): number {
  const x = Math.max(0, Math.min(1, (val - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * 캐릭터의 현재 액션 상태(ActionState)와 경과 시간(actionTimer)에 따라
 * 각 Bone의 상대 회전값 및 메쉬 수직 오프셋을 계산합니다.
 */
export function computeActionPose(
  state: CharacterActionState,
  actionTimer: number,
  idlePhase: number,
  breath: number,
  sway: number
): ActionPoseRotations {
  // 1. 기본 Standing Idle 포즈
  const defaultPose: ActionPoseRotations = {
    meshOffsetY: 0,
    leftThigh: [0, 0, 0],
    rightThigh: [0, 0, 0],
    leftKnee: [0, 0, 0],
    rightKnee: [0, 0, 0],
    leftFoot: [0, 0, 0],
    rightFoot: [0, 0, 0],
    leftArm: [0, -breath * 0.015, 0.82 + sway * 0.015],
    rightArm: [0, breath * 0.015, -0.82 - sway * 0.015],
    leftForearm: [0, -0.12 + breath * 0.01, 0],
    rightForearm: [0, 0.12 - breath * 0.01, 0],
    hips: [0, sway * 0.015, breath * 0.008],
    spine: [0, -sway * 0.010, breath * 0.020],
    spine1: [0, 0, breath * 0.008],
    spine2: [0, 0, breath * 0.008],
    neck: [0, sway * 0.008, -breath * 0.012],
    head: [Math.cos(idlePhase * 0.4) * 0.02, 0, -breath * 0.010],
    isPraying: false,
  };

  // -------------------------------------------------------------
  // [A] 손 흔들기 인사 (Wave)
  // -------------------------------------------------------------
  if (state === 'wave') {
    const duration = 1.8;
    const t = Math.min(actionTimer, duration);
    let weight = 0;
    if (t < 0.3) {
      weight = smoothstep(0, 0.3, t);
    } else if (t < 1.4) {
      weight = 1.0;
    } else {
      weight = 1.0 - smoothstep(1.4, duration, t);
    }

    const waveCycle = Math.sin(t * 13.0) * 0.35; // 손목/전완 좌우 흔들기

    // 오른팔 번쩍 들기
    const rightArmZ = lerp(-0.82, -0.25, weight);
    const rightArmY = lerp(0, 0.15, weight);
    const rightArmX = lerp(0, -0.20, weight);
    const rightForearmY = lerp(0.12, 0.65, weight);
    const rightForearmZ = waveCycle * weight;

    // 머리 살짝 갸웃 (반가운 표현)
    const headX = lerp(0, 0.10, weight);
    const headZ = lerp(0, -0.06, weight);

    return {
      ...defaultPose,
      rightArm: [rightArmX, rightArmY, rightArmZ],
      rightForearm: [0, rightForearmY, rightForearmZ],
      head: [headX, 0, headZ],
    };
  }

  // -------------------------------------------------------------
  // [B] 공손히 허리 숙여 인사 (Bow)
  // -------------------------------------------------------------
  if (state === 'bow') {
    const duration = 2.0;
    const t = Math.min(actionTimer, duration);
    let weight = 0;
    if (t < 0.6) {
      weight = smoothstep(0, 0.6, t);
    } else if (t < 1.2) {
      weight = 1.0;
    } else {
      weight = 1.0 - smoothstep(1.2, duration, t);
    }

    // 상체 숙임 각도
    const spineZ = lerp(defaultPose.spine[2], 0.45, weight);
    const spine1Z = lerp(defaultPose.spine1[2], 0.12, weight);
    const neckZ = lerp(defaultPose.neck[2], 0.12, weight);
    const headZ = lerp(defaultPose.head[2], 0.16, weight);

    // 양손은 단정하게 다리 옆에 모음
    const leftArmZ = lerp(0.82, 0.88, weight);
    const rightArmZ = lerp(-0.82, -0.88, weight);

    return {
      ...defaultPose,
      spine: [0, 0, spineZ],
      spine1: [0, 0, spine1Z],
      neck: [0, 0, neckZ],
      head: [0, 0, headZ],
      leftArm: [0, 0, leftArmZ],
      rightArm: [0, 0, rightArmZ],
    };
  }

  // -------------------------------------------------------------
  // [C] 서서 기도 (Standing Pray)
  // -------------------------------------------------------------
  if (state === 'standing_pray') {
    return {
      ...defaultPose,
      meshOffsetY: 0,
      // 가슴 앞 두 손 모으기 (합장 자세)
      leftArm: [0, -0.68, 0.32],
      rightArm: [0, 0.68, -0.32],
      leftForearm: [0, -0.88, 0.18],
      rightForearm: [0, 0.88, -0.18],
      // 상체 약간 기울임 & 머리 숙임
      spine: [0, 0, 0.10 + breath * 0.008],
      neck: [0, 0, 0.08],
      head: [0, 0, 0.22],
      isPraying: true,
    };
  }

  // -------------------------------------------------------------
  // [D] 의자 앉기 / 앉아 있기 / 앉아서 기도 / 일어서기
  // -------------------------------------------------------------
  if (
    state === 'sitting_down' ||
    state === 'sitting_idle' ||
    state === 'sitting_pray' ||
    state === 'standing_up'
  ) {
    let sitProgress = 1.0;
    if (state === 'sitting_down') {
      sitProgress = smoothstep(0, 0.70, actionTimer);
    } else if (state === 'standing_up') {
      sitProgress = 1.0 - smoothstep(0, 0.60, actionTimer);
    }

    // 1. 골반 및 허벅지 위치 높이 (0m -> +0.16m로 상승하여 좌석 쿠션에 자연스럽게 착석)
    const meshOffsetY = lerp(0, 0.16, sitProgress);

    // 2. 다리 관절: 허벅지 전방 90도(-1.50 rad), 무릎 하방 90도(+1.50 rad)
    const leftThighZ = lerp(0, -1.50, sitProgress);
    const rightThighZ = lerp(0, -1.50, sitProgress);
    const leftKneeZ = lerp(0, 1.50, sitProgress);
    const rightKneeZ = lerp(0, 1.50, sitProgress);
    const leftFootZ = lerp(0, 0.08, sitProgress);
    const rightFootZ = lerp(0, 0.08, sitProgress);

    // 3. 상체 및 팔 자세 분기 (일반 앉기 vs 앉아서 기도)
    const isPray = state === 'sitting_pray';

    // 앉아서 대기: 양손을 허벅지/무릎 위에 가지런히 올려둠
    const idleArmZ_L = lerp(0.82, 0.40, sitProgress);
    const idleArmZ_R = lerp(-0.82, -0.40, sitProgress);
    const idleArmY_L = lerp(0, -0.28, sitProgress);
    const idleArmY_R = lerp(0, 0.28, sitProgress);
    const idleForearmY_L = lerp(-0.12, -0.42, sitProgress);
    const idleForearmY_R = lerp(0.12, 0.42, sitProgress);

    // 앉아서 기도: 두 손을 가슴 앞으로 모으고 고개를 숙임
    const prayArmZ_L = lerp(0.82, 0.32, sitProgress);
    const prayArmZ_R = lerp(-0.82, -0.32, sitProgress);
    const prayArmY_L = lerp(0, -0.65, sitProgress);
    const prayArmY_R = lerp(0, 0.65, sitProgress);
    const prayForearmY_L = lerp(-0.12, -0.85, sitProgress);
    const prayForearmY_R = lerp(0.12, 0.85, sitProgress);

    const leftArm = isPray
      ? [0, prayArmY_L, prayArmZ_L] as [number, number, number]
      : [0, idleArmY_L, idleArmZ_L] as [number, number, number];
    const rightArm = isPray
      ? [0, prayArmY_R, prayArmZ_R] as [number, number, number]
      : [0, idleArmY_R, idleArmZ_R] as [number, number, number];
    const leftForearm = isPray
      ? [0, prayForearmY_L, 0.18 * sitProgress] as [number, number, number]
      : [0, idleForearmY_L, 0] as [number, number, number];
    const rightForearm = isPray
      ? [0, prayForearmY_R, -0.18 * sitProgress] as [number, number, number]
      : [0, idleForearmY_R, 0] as [number, number, number];

    const spineZ = isPray
      ? lerp(0, 0.14 + breath * 0.008, sitProgress)
      : lerp(0, 0.03 + breath * 0.010, sitProgress);
    const neckZ = isPray
      ? lerp(0, 0.10, sitProgress)
      : lerp(0, -0.02, sitProgress);
    const headZ = isPray
      ? lerp(0, 0.24, sitProgress)
      : lerp(0, -0.02, sitProgress);

    return {
      meshOffsetY,
      leftThigh: [0, 0, leftThighZ],
      rightThigh: [0, 0, rightThighZ],
      leftKnee: [0, 0, leftKneeZ],
      rightKnee: [0, 0, rightKneeZ],
      leftFoot: [0, 0, leftFootZ],
      rightFoot: [0, 0, rightFootZ],
      leftArm,
      rightArm,
      leftForearm,
      rightForearm,
      hips: [0, 0, 0],
      spine: [0, 0, spineZ],
      spine1: [0, 0, breath * 0.006 * sitProgress],
      spine2: [0, 0, breath * 0.006 * sitProgress],
      neck: [0, 0, neckZ],
      head: [0, 0, headZ],
      isPraying: isPray && sitProgress > 0.4,
    };
  }

  // -------------------------------------------------------------
  // [E] 무릎 꿇기 / 무릎 대기 / 무릎 기도 / 무릎에서 일어서기
  // -------------------------------------------------------------
  if (
    state === 'kneeling_down' ||
    state === 'kneeling_idle' ||
    state === 'kneeling_pray' ||
    state === 'standing_from_kneeling'
  ) {
    let kneelProgress = 1.0;
    if (state === 'kneeling_down') {
      kneelProgress = smoothstep(0, 0.75, actionTimer);
    } else if (state === 'standing_from_kneeling') {
      kneelProgress = 1.0 - smoothstep(0, 0.65, actionTimer);
    }

    // 1. 골반 및 신체 높이 하강 (0m -> -0.22m로 내려와 무릎이 지면/방석에 닿음)
    const meshOffsetY = lerp(0, -0.22, kneelProgress);

    // 2. 다리 관절: 허벅지는 수직 유지(+0.12 rad), 무릎은 완전히 뒤로 접힘(+2.05 rad), 발목 뒤로 펴짐(-0.35 rad)
    const leftThighZ = lerp(0, 0.12, kneelProgress);
    const rightThighZ = lerp(0, 0.12, kneelProgress);
    const leftKneeZ = lerp(0, 2.05, kneelProgress);
    const rightKneeZ = lerp(0, 2.05, kneelProgress);
    const leftFootZ = lerp(0, -0.35, kneelProgress);
    const rightFootZ = lerp(0, -0.35, kneelProgress);

    const isPray = state === 'kneeling_pray';

    // 무릎 대기 자세
    const idleArmZ_L = lerp(0.82, 0.45, kneelProgress);
    const idleArmZ_R = lerp(-0.82, -0.45, kneelProgress);
    const idleArmY_L = lerp(0, -0.20, kneelProgress);
    const idleArmY_R = lerp(0, 0.20, kneelProgress);
    const idleForearmY_L = lerp(-0.12, -0.35, kneelProgress);
    const idleForearmY_R = lerp(0.12, 0.35, kneelProgress);

    // 무릎 기도 자세
    const prayArmZ_L = lerp(0.82, 0.32, kneelProgress);
    const prayArmZ_R = lerp(-0.82, -0.32, kneelProgress);
    const prayArmY_L = lerp(0, -0.68, kneelProgress);
    const prayArmY_R = lerp(0, 0.68, kneelProgress);
    const prayForearmY_L = lerp(-0.12, -0.88, kneelProgress);
    const prayForearmY_R = lerp(0.12, 0.88, kneelProgress);

    const leftArm = isPray
      ? [0, prayArmY_L, prayArmZ_L] as [number, number, number]
      : [0, idleArmY_L, idleArmZ_L] as [number, number, number];
    const rightArm = isPray
      ? [0, prayArmY_R, prayArmZ_R] as [number, number, number]
      : [0, idleArmY_R, idleArmZ_R] as [number, number, number];
    const leftForearm = isPray
      ? [0, prayForearmY_L, 0.18 * kneelProgress] as [number, number, number]
      : [0, idleForearmY_L, 0] as [number, number, number];
    const rightForearm = isPray
      ? [0, prayForearmY_R, -0.18 * kneelProgress] as [number, number, number]
      : [0, idleForearmY_R, 0] as [number, number, number];

    const spineZ = isPray
      ? lerp(0, 0.18 + breath * 0.008, kneelProgress)
      : lerp(0, 0.04 + breath * 0.010, kneelProgress);
    const neckZ = isPray
      ? lerp(0, 0.12, kneelProgress)
      : lerp(0, 0.02, kneelProgress);
    const headZ = isPray
      ? lerp(0, 0.28, kneelProgress)
      : lerp(0, 0.05, kneelProgress);

    return {
      meshOffsetY,
      leftThigh: [0, 0, leftThighZ],
      rightThigh: [0, 0, rightThighZ],
      leftKnee: [0, 0, leftKneeZ],
      rightKnee: [0, 0, rightKneeZ],
      leftFoot: [0, 0, leftFootZ],
      rightFoot: [0, 0, rightFootZ],
      leftArm,
      rightArm,
      leftForearm,
      rightForearm,
      hips: [0, 0, 0],
      spine: [0, 0, spineZ],
      spine1: [0, 0, breath * 0.006 * kneelProgress],
      spine2: [0, 0, breath * 0.006 * kneelProgress],
      neck: [0, 0, neckZ],
      head: [0, 0, headZ],
      isPraying: isPray && kneelProgress > 0.4,
    };
  }

  // 그 외: 기본 포즈 반환
  return defaultPose;
}
