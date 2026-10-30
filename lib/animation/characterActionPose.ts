import { CharacterActionState } from './actionTypes';

export interface ActionPoseRotations {
  // 메쉬 Y 위치 오프셋 (앉기 시 +0.37m, 바닥 무릎 꿇기 시 -0.048m, 방석 무릎 시 +0.092m)
  meshOffsetY: number;

  // 어깨 관절 (쇄골) [x, y, z]
  leftShoulder: [number, number, number];
  rightShoulder: [number, number, number];

  // 팔 관절 [x, y, z]
  leftArm: [number, number, number];
  rightArm: [number, number, number];
  leftForearm: [number, number, number];
  rightForearm: [number, number, number];

  // 손 관절 [x, y, z]
  leftHand: [number, number, number];
  rightHand: [number, number, number];

  // 다리 관절 [x, y, z]
  leftThigh: [number, number, number];
  rightThigh: [number, number, number];
  leftKnee: [number, number, number];
  rightKnee: [number, number, number];
  leftFoot: [number, number, number];
  rightFoot: [number, number, number];

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
 * 각 Bone의 상대 회전값 및 메쉬 수직 오프셋을 실시간 부드럽게 계산합니다.
 */
export function computeActionPose(
  state: CharacterActionState,
  actionTimer: number,
  idlePhase: number,
  breath: number,
  sway: number,
  isKneelerTarget = false
): ActionPoseRotations {
  // 1. 기본 Standing Idle 포즈
  const defaultPose: ActionPoseRotations = {
    meshOffsetY: 0,
    leftShoulder: [0, 0, 0],
    rightShoulder: [0, 0, 0],
    leftArm: [0, -breath * 0.015, 0.82 + sway * 0.015],
    rightArm: [0, breath * 0.015, -0.82 - sway * 0.015],
    leftForearm: [0, -0.12 + breath * 0.01, 0],
    rightForearm: [0, 0.12 - breath * 0.01, 0],
    leftHand: [0, 0, 0],
    rightHand: [0, 0, 0],
    leftThigh: [0, 0, 0],
    rightThigh: [0, 0, 0],
    leftKnee: [0, 0, 0],
    rightKnee: [0, 0, 0],
    leftFoot: [0, 0, 0],
    rightFoot: [0, 0, 0],
    hips: [0, sway * 0.015, breath * 0.008],
    spine: [0, -sway * 0.010, breath * 0.020],
    spine1: [0, 0, breath * 0.008],
    spine2: [0, 0, breath * 0.008],
    neck: [0, sway * 0.008, -breath * 0.012],
    head: [Math.cos(idlePhase * 0.4) * 0.02, 0, -breath * 0.010],
    isPraying: false,
  };

  // -------------------------------------------------------------
  // [A] 손 흔들기 인사 (Wave) - 머리 옆까지 높이 들어 좌우로 경쾌하게 흔들기
  // -------------------------------------------------------------
  if (state === 'wave') {
    const duration = 2.2;
    const t = Math.min(actionTimer, duration);
    let weight = 0;
    if (t < 0.35) {
      weight = smoothstep(0, 0.35, t);
    } else if (t < 1.75) {
      weight = 1.0;
    } else {
      weight = 1.0 - smoothstep(1.75, duration, t);
    }

    // 전완 및 손목의 활기찬 좌우 흔들기 웨이브 (머리 옆에서 확실하게 흔들림)
    const waveFreq = 12.0;
    const waveCycle = Math.sin(t * waveFreq);
    const forearmZ = waveCycle * 0.55 * weight;
    const handZ = Math.sin(t * waveFreq + 0.4) * 0.35 * weight;

    // 오른 어깨와 팔을 머리 옆/귀 높이(Z=+1.45)까지 충분히 올려줌
    const rightShoulderY = lerp(0, 0.35, weight);
    const rightShoulderZ = lerp(0, -0.45, weight);

    const rightArmX = lerp(0, 0.15, weight);
    const rightArmY = lerp(0, 0.25, weight);
    const rightArmZ = lerp(-0.82, 1.45, weight);

    const rightForearmY = lerp(0.12, 0.20, weight);
    const rightForearmZ = forearmZ;

    // 머리를 반대편으로 살짝 갸웃 (귀엽고 반가운 각도)
    const headX = lerp(0, 0.08, weight);
    const headZ = lerp(0, -0.08, weight);

    return {
      ...defaultPose,
      rightShoulder: [0, rightShoulderY, rightShoulderZ],
      rightArm: [rightArmX, rightArmY, rightArmZ],
      rightForearm: [0, rightForearmY, rightForearmZ],
      rightHand: [0, 0, handZ],
      head: [headX, 0, headZ],
    };
  }

  // -------------------------------------------------------------
  // [B] 정중한 배꼽인사 (Deep Bow) - 두 손을 배꼽에 모으고 허리를 깊게 숙이기
  // -------------------------------------------------------------
  if (state === 'bow') {
    const duration = 2.4;
    const t = Math.min(actionTimer, duration);
    let weight = 0;
    if (t < 0.70) {
      weight = smoothstep(0, 0.70, t);
    } else if (t < 1.50) {
      weight = 1.0;
    } else {
      weight = 1.0 - smoothstep(1.50, duration, t);
    }

    // 배꼽인사: 양손을 아랫배/배꼽 위에 가지런히 단정하게 포개어 모음
    const leftArmX = lerp(0, 0.40, weight);
    const leftArmY = lerp(0, -0.65, weight);
    const leftArmZ = lerp(0.82, 0.65, weight);

    const rightArmX = lerp(0, 0.40, weight);
    const rightArmY = lerp(0, 0.65, weight);
    const rightArmZ = lerp(-0.82, -0.65, weight);

    const leftForearmY = lerp(-0.12, -0.90, weight);
    const leftForearmZ = lerp(0, 0.35, weight);

    const rightForearmY = lerp(0.12, 0.90, weight);
    const rightForearmZ = lerp(0, -0.35, weight);

    // 허리 및 척추를 정중하게 깊이 숙임 (Spine 약 45도 + 상부 척추 25도 = 총 70도 깊은 배꼽인사)
    const spineZ = lerp(defaultPose.spine[2], 0.72, weight);
    const spine1Z = lerp(defaultPose.spine1[2], 0.25, weight);
    const spine2Z = lerp(defaultPose.spine2[2], 0.12, weight);
    const neckZ = lerp(defaultPose.neck[2], 0.15, weight);
    const headZ = lerp(defaultPose.head[2], 0.25, weight);

    return {
      ...defaultPose,
      spine: [0, 0, spineZ],
      spine1: [0, 0, spine1Z],
      spine2: [0, 0, spine2Z],
      neck: [0, 0, neckZ],
      head: [0, 0, headZ],
      leftArm: [leftArmX, leftArmY, leftArmZ],
      rightArm: [rightArmX, rightArmY, rightArmZ],
      leftForearm: [0, leftForearmY, leftForearmZ],
      rightForearm: [0, rightForearmY, rightForearmZ],
    };
  }

  // -------------------------------------------------------------
  // [C] 서서 기도 (Standing Pray) - 쇄골/팔꿈치/손목 정밀 보정으로 양손 완전 밀착 (합장)
  // -------------------------------------------------------------
  if (state === 'standing_pray') {
    // 서서 기도 진입 시 0.35초 동안 스무스스텝으로 부드럽게 손을 모음 (프레임 튐 완전 제거)
    const blend = smoothstep(0, 0.35, actionTimer);

    // 어깨/쇄골을 가슴 안쪽으로 살짝 모아 양팔이 정확히 중심선(X=0)에서 만나도록 정밀 보정
    const leftShoulderX = lerp(0, 0.30, blend);
    const leftShoulderY = lerp(0, -0.55, blend);
    const leftShoulderZ = lerp(0, 0.95, blend);

    const rightShoulderY = lerp(0, 0.60, blend);
    const rightShoulderZ = lerp(0, -0.90, blend);

    // 상완을 전방으로 모아 올림
    const leftArmX = lerp(0, 0.80, blend);
    const leftArmY = lerp(0, -1.55, blend);
    const leftArmZ = lerp(0.82, 0.40, blend);

    const rightArmX = lerp(0, 0.70, blend);
    const rightArmY = lerp(0, 1.45, blend);
    const rightArmZ = lerp(-0.82, -0.40, blend);

    // 전완을 가슴 중심 쪽으로 굽혀 두 손바닥을 완벽히 맞닿게 함 (거리 < 9mm 합장)
    const leftForearmX = lerp(0, 0.50, blend);
    const leftForearmY = lerp(-0.12, -2.10, blend);
    const leftForearmZ = lerp(0, 1.30, blend);

    const rightForearmX = lerp(0, 0.50, blend);
    const rightForearmY = lerp(0.12, 2.10, blend);
    const rightForearmZ = lerp(0, -1.20, blend);

    // 손목을 곧게 펴 손끝이 위를 향하도록 정렬
    const leftHandY = lerp(0, -0.80, blend);
    const rightHandY = lerp(0, 0.80, blend);

    // 상체 경건한 미세 전방 기울임 & 머리 숙임
    const spineZ = lerp(0, 0.10 + breath * 0.008, blend);
    const neckZ = lerp(0, 0.08, blend);
    const headZ = lerp(0, 0.22, blend);

    return {
      ...defaultPose,
      meshOffsetY: 0,
      leftShoulder: [leftShoulderX, leftShoulderY, leftShoulderZ],
      rightShoulder: [0, rightShoulderY, rightShoulderZ],
      leftArm: [leftArmX, leftArmY, leftArmZ],
      rightArm: [rightArmX, rightArmY, rightArmZ],
      leftForearm: [leftForearmX, leftForearmY, leftForearmZ],
      rightForearm: [rightForearmX, rightForearmY, rightForearmZ],
      leftHand: [0, leftHandY, 0],
      rightHand: [0, rightHandY, 0],
      spine: [0, 0, spineZ],
      neck: [0, 0, neckZ],
      head: [0, 0, headZ],
      isPraying: blend > 0.4,
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

    // ★ 의자 높이 보정: 장의자 좌석 쿠션 높이(0.46m)에 골반이 정확히 밀착되도록 +0.37m 상승
    // (이전 0.16m로 인해 의자 밑으로 파묻히던 현상 완벽 해결)
    const meshOffsetY = lerp(0, 0.37, sitProgress);

    // 다리 관절: 허벅지 90도 전방 회전(-1.55 rad), 무릎 90도 하방 회전(+1.55 rad)
    const leftThighZ = lerp(0, -1.55, sitProgress);
    const rightThighZ = lerp(0, -1.55, sitProgress);
    const leftKneeZ = lerp(0, 1.55, sitProgress);
    const rightKneeZ = lerp(0, 1.55, sitProgress);
    const leftFootZ = lerp(0, 0.12, sitProgress);
    const rightFootZ = lerp(0, 0.12, sitProgress);

    const isPray = state === 'sitting_pray';

    if (isPray) {
      // 앉아서 기도: 두 손을 가슴 앞에 정확히 모음 (합장)
      const prayBlend = sitProgress;
      return {
        meshOffsetY,
        leftShoulder: [0.30 * prayBlend, -0.55 * prayBlend, 0.95 * prayBlend],
        rightShoulder: [0, 0.60 * prayBlend, -0.90 * prayBlend],
        leftArm: [0.80 * prayBlend, -1.55 * prayBlend, lerp(0.82, 0.40, prayBlend)],
        rightArm: [0.70 * prayBlend, 1.45 * prayBlend, lerp(-0.82, -0.40, prayBlend)],
        leftForearm: [0.50 * prayBlend, lerp(-0.12, -2.10, prayBlend), 1.30 * prayBlend],
        rightForearm: [0.50 * prayBlend, lerp(0.12, 2.10, prayBlend), -1.20 * prayBlend],
        leftHand: [0, -0.80 * prayBlend, 0],
        rightHand: [0, 0.80 * prayBlend, 0],
        leftThigh: [0, 0, leftThighZ],
        rightThigh: [0, 0, rightThighZ],
        leftKnee: [0, 0, leftKneeZ],
        rightKnee: [0, 0, rightKneeZ],
        leftFoot: [0, 0, leftFootZ],
        rightFoot: [0, 0, rightFootZ],
        hips: [0, 0, 0],
        spine: [0, 0, lerp(0, 0.14 + breath * 0.008, sitProgress)],
        spine1: [0, 0, breath * 0.006 * sitProgress],
        spine2: [0, 0, breath * 0.006 * sitProgress],
        neck: [0, 0, lerp(0, 0.10, sitProgress)],
        head: [0, 0, lerp(0, 0.24, sitProgress)],
        isPraying: true,
      };
    } else {
      // 앉아 있기 (Sitting Idle): 양손을 편안하게 허벅지/무릎 위에 올려놓음
      const idleArmZ_L = lerp(0.82, 0.42, sitProgress);
      const idleArmZ_R = lerp(-0.82, -0.42, sitProgress);
      const idleArmY_L = lerp(0, -0.32, sitProgress);
      const idleArmY_R = lerp(0, 0.32, sitProgress);
      const idleForearmY_L = lerp(-0.12, -0.45, sitProgress);
      const idleForearmY_R = lerp(0.12, 0.45, sitProgress);

      return {
        meshOffsetY,
        leftShoulder: [0, 0, 0],
        rightShoulder: [0, 0, 0],
        leftArm: [0, idleArmY_L, idleArmZ_L],
        rightArm: [0, idleArmY_R, idleArmZ_R],
        leftForearm: [0, idleForearmY_L, 0],
        rightForearm: [0, idleForearmY_R, 0],
        leftHand: [0, 0, 0],
        rightHand: [0, 0, 0],
        leftThigh: [0, 0, leftThighZ],
        rightThigh: [0, 0, rightThighZ],
        leftKnee: [0, 0, leftKneeZ],
        rightKnee: [0, 0, rightKneeZ],
        leftFoot: [0, 0, leftFootZ],
        rightFoot: [0, 0, rightFootZ],
        hips: [0, 0, 0],
        spine: [0, 0, lerp(0, 0.03 + breath * 0.010, sitProgress)],
        spine1: [0, 0, breath * 0.006 * sitProgress],
        spine2: [0, 0, breath * 0.006 * sitProgress],
        neck: [0, 0, lerp(0, -0.02, sitProgress)],
        head: [0, 0, lerp(0, -0.02, sitProgress)],
        isPraying: false,
      };
    }
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

    // ★ 무릎 높이 보정:
    // 이전 -0.22m 하강으로 바닥 아래로 꺼지던 문제를 완전히 해결!
    // 바닥 무릎 꿇기는 -0.048m만 자연스럽게 낮아져 무릎이 지면(Y=0)에 가볍게 접지됨.
    // 기도대 방석(0.14m) 위에서는 +0.092m로 방석 위에 안착.
    const targetKneelOffset = isKneelerTarget ? 0.092 : -0.048;
    const meshOffsetY = lerp(0, targetKneelOffset, kneelProgress);

    // 다리 관절: 무릎을 지면과 평평하게 접음 (+1.75 rad)
    const leftThighZ = lerp(0, 0.08, kneelProgress);
    const rightThighZ = lerp(0, 0.08, kneelProgress);
    const leftKneeZ = lerp(0, 1.75, kneelProgress);
    const rightKneeZ = lerp(0, 1.75, kneelProgress);
    const leftFootZ = lerp(0, -0.25, kneelProgress);
    const rightFootZ = lerp(0, -0.25, kneelProgress);

    const isPray = state === 'kneeling_pray';

    if (isPray) {
      // 무릎 기도: 두 손을 가슴 앞에 정확히 모음 (합장)
      const prayBlend = kneelProgress;
      return {
        meshOffsetY,
        leftShoulder: [0.30 * prayBlend, -0.55 * prayBlend, 0.95 * prayBlend],
        rightShoulder: [0, 0.60 * prayBlend, -0.90 * prayBlend],
        leftArm: [0.80 * prayBlend, -1.55 * prayBlend, lerp(0.82, 0.40, prayBlend)],
        rightArm: [0.70 * prayBlend, 1.45 * prayBlend, lerp(-0.82, -0.40, prayBlend)],
        leftForearm: [0.50 * prayBlend, lerp(-0.12, -2.10, prayBlend), 1.30 * prayBlend],
        rightForearm: [0.50 * prayBlend, lerp(0.12, 2.10, prayBlend), -1.20 * prayBlend],
        leftHand: [0, -0.80 * prayBlend, 0],
        rightHand: [0, 0.80 * prayBlend, 0],
        leftThigh: [0, 0, leftThighZ],
        rightThigh: [0, 0, rightThighZ],
        leftKnee: [0, 0, leftKneeZ],
        rightKnee: [0, 0, rightKneeZ],
        leftFoot: [0, 0, leftFootZ],
        rightFoot: [0, 0, rightFootZ],
        hips: [0, 0, 0],
        spine: [0, 0, lerp(0, 0.18 + breath * 0.008, kneelProgress)],
        spine1: [0, 0, breath * 0.006 * kneelProgress],
        spine2: [0, 0, breath * 0.006 * kneelProgress],
        neck: [0, 0, lerp(0, 0.12, kneelProgress)],
        head: [0, 0, lerp(0, 0.28, kneelProgress)],
        isPraying: true,
      };
    } else {
      // 무릎 대기 (Kneeling Idle)
      const idleArmZ_L = lerp(0.82, 0.45, kneelProgress);
      const idleArmZ_R = lerp(-0.82, -0.45, kneelProgress);
      const idleArmY_L = lerp(0, -0.22, kneelProgress);
      const idleArmY_R = lerp(0, 0.22, kneelProgress);
      const idleForearmY_L = lerp(-0.12, -0.38, kneelProgress);
      const idleForearmY_R = lerp(0.12, 0.38, kneelProgress);

      return {
        meshOffsetY,
        leftShoulder: [0, 0, 0],
        rightShoulder: [0, 0, 0],
        leftArm: [0, idleArmY_L, idleArmZ_L],
        rightArm: [0, idleArmY_R, idleArmZ_R],
        leftForearm: [0, idleForearmY_L, 0],
        rightForearm: [0, idleForearmY_R, 0],
        leftHand: [0, 0, 0],
        rightHand: [0, 0, 0],
        leftThigh: [0, 0, leftThighZ],
        rightThigh: [0, 0, rightThighZ],
        leftKnee: [0, 0, leftKneeZ],
        rightKnee: [0, 0, rightKneeZ],
        leftFoot: [0, 0, leftFootZ],
        rightFoot: [0, 0, rightFootZ],
        hips: [0, 0, 0],
        spine: [0, 0, lerp(0, 0.04 + breath * 0.010, kneelProgress)],
        spine1: [0, 0, breath * 0.006 * kneelProgress],
        spine2: [0, 0, breath * 0.006 * kneelProgress],
        neck: [0, 0, lerp(0, 0.02, kneelProgress)],
        head: [0, 0, lerp(0, 0.05, kneelProgress)],
        isPraying: false,
      };
    }
  }

  // 그 외: 기본 포즈 반환
  return defaultPose;
}
