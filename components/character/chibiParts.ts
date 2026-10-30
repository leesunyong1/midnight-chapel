import * as THREE from 'three';

export interface ChibiCustomizationOptions {
  /** 피부 톤 (기본값: 자연스러운 따뜻한 베이지 #fcdcc5) */
  skinColor?: string;
  /** 피부 표면 거칠기 (기본값: 0.70) */
  skinRoughness?: number;
  /** 머리카락 색상 (기본값: 자연스러운 다크 브라운 #382319) */
  hairColor?: string;
  /** 머리카락 표면 거칠기 (기본값: 0.58) */
  hairRoughness?: number;
  /** 눈동자 메인 색상 (기본값: 딥 에스프레소 #221c26) */
  eyeColor?: string;
  /** 눈 깜빡임 주기 범위 [최소초, 최대초] (기본값: [3.5, 6.0]) */
  blinkInterval?: [number, number];
  /** 눈썹 표시 여부 (기본값: true) */
  showEyebrows?: boolean;
  /** 볼터치 홍조 표시 여부 (기본값: true) */
  showBlush?: boolean;
  /** 입 표시 여부 (기본값: true) */
  showMouth?: boolean;

  // === 4. 차기 단계 의상 모듈 구조 준비 (확장용) ===
  topStyle?: 'none' | 'chapel_tunic' | string;
  bottomStyle?: 'none' | 'chapel_pants' | string;
  shoesStyle?: 'none' | 'leather_boots' | string;
  accessories?: string[];
}

export interface ChibiFaceController {
  /** 매 프레임 useFrame에서 호출하여 자연스러운 눈 깜빡임 및 얼굴 표현 업데이트 */
  update: (dt: number) => void;
  /** 머리카락 머티리얼 참조 (동적 색상 변경 지원) */
  hairMaterial: THREE.MeshStandardMaterial;
  /** 피부 머티리얼 참조 */
  skinMaterial: THREE.MeshStandardMaterial;
}

// =========================================================================
// 절차적 캔버스 텍스처 생성기 (외부 이미지 의존성 없는 가볍고 선명한 텍스처)
// =========================================================================

function createEyeTexture(isClosed = false): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 256, 256);

  if (isClosed) {
    // 눈을 감았을 때 귀여운 부드러운 속눈썹 호 (Closed Eye Smile)
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#221915';
    ctx.beginPath();
    ctx.arc(128, 140, 64, Math.PI * 0.15, Math.PI * 0.85, false);
    ctx.stroke();

    // 깜찍한 속눈썹 꼬리
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(180, 168);
    ctx.lineTo(202, 178);
    ctx.stroke();
  } else {
    // 뜬 눈: 깊고 따뜻한 에스프레소 베이스 + 반짝이는 듀얼 하이라이트
    // 1. 눈동자 바저 (약간 수직으로 긴 타원)
    const eyeGrad = ctx.createLinearGradient(0, 30, 0, 230);
    eyeGrad.addColorStop(0, '#1c1622'); // 상단 딥 다크
    eyeGrad.addColorStop(0.55, '#2e1f18'); // 중간 다크 브라운
    eyeGrad.addColorStop(1, '#5a3826'); // 하단 따뜻한 앰버 브라운

    ctx.fillStyle = eyeGrad;
    ctx.beginPath();
    ctx.ellipse(128, 132, 78, 96, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. 상단 속눈썹 라인 및 그림자
    ctx.fillStyle = '#161118';
    ctx.beginPath();
    ctx.ellipse(128, 70, 84, 28, 0, 0, Math.PI);
    ctx.fill();

    // 3. 눈동자 속 동공 (Pupil)
    ctx.fillStyle = '#110e14';
    ctx.beginPath();
    ctx.ellipse(128, 136, 42, 54, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. 하단 은은한 림 반사광
    ctx.strokeStyle = 'rgba(214, 160, 120, 0.45)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(128, 142, 60, Math.PI * 0.25, Math.PI * 0.75, false);
    ctx.stroke();

    // 5. [핵심] 주 하이라이트 (우측 상단 맑은 반사광)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(156, 88, 26, 32, -Math.PI * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // 6. 보조 미니 하이라이트 (좌측 하단 깜찍한 반짝임)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(98, 172, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createBlushTexture(): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
  grad.addColorStop(0, 'rgba(244, 114, 130, 0.75)'); // 사랑스러운 코랄 핑크
  grad.addColorStop(0.5, 'rgba(248, 140, 150, 0.40)');
  grad.addColorStop(1, 'rgba(255, 180, 180, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createMouthTexture(): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 아기자기한 미소 입 (Cute Soft Smile)
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#6f2d2d';
  ctx.beginPath();
  ctx.arc(64, 48, 38, Math.PI * 0.22, Math.PI * 0.78, false);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createEyebrowTexture(): THREE.CanvasTexture {
  if (typeof document === 'undefined') {
    return new THREE.CanvasTexture({} as HTMLCanvasElement);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 부드럽고 차분한 아치형 눈썹
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#382319';
  ctx.beginPath();
  ctx.arc(64, 68, 48, Math.PI * 1.25, Math.PI * 1.75, false);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

// =========================================================================
// 3D 헤어 메시 생성기 (부드러운 볼륨감 + 앞머리 + 옆머리 + 뒷머리 클러스터)
// =========================================================================

function buildChibiHairMesh(hairMaterial: THREE.MeshStandardMaterial): THREE.Group {
  const hairGroup = new THREE.Group();
  hairGroup.name = 'ChibiHairGroup';

  // 1. 정수리 돔 (Crown Volume): 둥글고 풍성한 실루엣 형성
  const crownGeo = new THREE.SphereGeometry(0.168, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.42);
  const crownMesh = new THREE.Mesh(crownGeo, hairMaterial);
  crownMesh.position.set(0, 0.138, -0.005);
  crownMesh.scale.set(1.02, 1.05, 1.02);
  crownMesh.castShadow = true;
  hairGroup.add(crownMesh);

  // 2. 후두부 및 측두부 쉘 (Back & Side Shell): 얼굴 앞면을 열어두고 뒷통수와 옆머리를 감쌈
  // phiStart: Math.PI * 0.32 ~ phiLength: Math.PI * 1.36
  const backShellGeo = new THREE.SphereGeometry(
    0.168,
    24,
    16,
    Math.PI * 0.30,
    Math.PI * 1.40,
    0.15,
    Math.PI * 0.68
  );
  const backShell = new THREE.Mesh(backShellGeo, hairMaterial);
  backShell.position.set(0, 0.135, -0.012);
  backShell.scale.set(1.03, 1.02, 1.07);
  backShell.castShadow = true;
  hairGroup.add(backShell);

  // 3. 앞머리 클러스터 (Front Bangs): 이마 위로 자연스럽게 내려오는 3단 볼륨
  // 3-A. 가운데 앞머리 (Center Bang)
  const centerBangGeo = new THREE.CapsuleGeometry(0.038, 0.052, 8, 12);
  const centerBang = new THREE.Mesh(centerBangGeo, hairMaterial);
  centerBang.position.set(0, 0.154, 0.144);
  centerBang.rotation.set(-0.35, 0, 0);
  centerBang.scale.set(1.22, 1.02, 0.72);
  centerBang.castShadow = true;
  hairGroup.add(centerBang);

  // 3-B. 좌측 앞머리 (Left Bang)
  const leftBangGeo = new THREE.CapsuleGeometry(0.034, 0.058, 8, 12);
  const leftBang = new THREE.Mesh(leftBangGeo, hairMaterial);
  leftBang.position.set(-0.052, 0.147, 0.138);
  leftBang.rotation.set(-0.32, 0.15, -0.22);
  leftBang.scale.set(1.12, 1.0, 0.68);
  leftBang.castShadow = true;
  hairGroup.add(leftBang);

  // 3-C. 우측 앞머리 (Right Bang)
  const rightBangGeo = new THREE.CapsuleGeometry(0.034, 0.058, 8, 12);
  const rightBang = new THREE.Mesh(rightBangGeo, hairMaterial);
  rightBang.position.set(0.052, 0.147, 0.138);
  rightBang.rotation.set(-0.32, -0.15, 0.22);
  rightBang.scale.set(1.12, 1.0, 0.68);
  rightBang.castShadow = true;
  hairGroup.add(rightBang);

  // 4. 옆머리/구레나룻 (Side Locks): 볼과 홍조를 자연스럽게 감싸는 헤어 라인
  // 4-A. 좌측 옆머리
  const leftSideGeo = new THREE.CapsuleGeometry(0.032, 0.088, 8, 12);
  const leftSide = new THREE.Mesh(leftSideGeo, hairMaterial);
  leftSide.position.set(-0.146, 0.098, 0.052);
  leftSide.rotation.set(0.12, 0, -0.16);
  leftSide.scale.set(0.85, 1.0, 1.25);
  leftSide.castShadow = true;
  hairGroup.add(leftSide);

  // 4-B. 우측 옆머리
  const rightSideGeo = new THREE.CapsuleGeometry(0.032, 0.088, 8, 12);
  const rightSide = new THREE.Mesh(rightSideGeo, hairMaterial);
  rightSide.position.set(0.146, 0.098, 0.052);
  rightSide.rotation.set(0.12, 0, 0.16);
  rightSide.scale.set(0.85, 1.0, 1.25);
  rightSide.castShadow = true;
  hairGroup.add(rightSide);

  // 5. 뒷머리 목덜미 하단 볼륨 (Nape Hair)
  const napeGeo = new THREE.CapsuleGeometry(0.042, 0.12, 8, 12);
  const napeMesh = new THREE.Mesh(napeGeo, hairMaterial);
  napeMesh.position.set(0, 0.065, -0.128);
  napeMesh.rotation.set(0, 0, Math.PI / 2);
  napeMesh.scale.set(0.9, 1.1, 0.7);
  napeMesh.castShadow = true;
  hairGroup.add(napeMesh);

  return hairGroup;
}

// =========================================================================
// 메인 치비 캐릭터 리디자인 & 얼굴 파츠 부착 함수
// =========================================================================

export function setupChibiCharacterStyling(
  clonedScene: THREE.Object3D,
  options: ChibiCustomizationOptions = {}
): ChibiFaceController {
  const {
    skinColor = '#fcdcc5', // 부드럽고 따뜻한 자연 베이지
    skinRoughness = 0.70,
    hairColor = '#382319', // 깊고 부드러운 다크 브라운
    hairRoughness = 0.58,
    blinkInterval = [3.5, 6.0],
    showEyebrows = true,
    showBlush = true,
    showMouth = true,
  } = options;

  // 1. 기존 피부 머티리얼 수정 (핑크/보라색 -> 따뜻한 자연 베이지)
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(skinColor),
    roughness: skinRoughness,
    metalness: 0.02,
  });

  clonedScene.traverse((child: any) => {
    if (child.isSkinnedMesh) {
      if (child.name === 'Object_7') {
        // 본체 피부 메쉬
        child.material = skinMaterial;
        child.castShadow = true;
        child.receiveShadow = true;
      } else if (child.name === 'Object_9') {
        // 기존 밋밋한 검은 점 눈은 숨기고, 신규 입체 눈 시스템으로 대체
        child.visible = false;
      }
    }
  });

  // 2. 주요 본 찾기 및 팔 비율 최적화 (치비 체형에 어울리도록 팔 길이 약 15% 단축)
  let headBone: THREE.Bone | null = null;
  const ARM_SCALE_X = 0.85;

  clonedScene.traverse((child: any) => {
    if (child.isBone) {
      if (child.name === 'Head_06') {
        headBone = child;
      } else if (child.name === 'Left_Arm_017' || child.name === 'RightArm_09') {
        // 팔 본의 길이 방향(X축)을 살짝 축소하여 긴 팔을 깜찍한 치비 비율로 보정
        child.scale.x = ARM_SCALE_X;
      } else if (child.name === 'Left_Hand_019' || child.name === 'RightHand_011') {
        // 손 모양이 납작해지지 않도록 역보정하여 동글동글한 손 크기 보존
        child.scale.x = 1 / ARM_SCALE_X;
      }
    }
  });

  if (!headBone) {
    console.warn('[ChibiStyling] Head_06 bone not found');
    return {
      update: () => {},
      hairMaterial: new THREE.MeshStandardMaterial(),
      skinMaterial,
    };
  }

  // 3. 머리 본 전용 로컬 좌표계 래퍼 그룹 (ChibiHeadGroup) 생성
  // headBone에 직접 자식으로 부착하므로 모든 머리 회전/끄덕임/기울임을 100% 동기화 추적
  clonedScene.updateWorldMatrix(true, true);
  const headGroup = new THREE.Group();
  headGroup.name = 'ChibiHeadGroup';
  (headBone as THREE.Bone).add(headGroup);

  // 미터 단위(0, 0.210, 0) 기준 역행렬 분해 변환
  const targetWorldMatrix = new THREE.Matrix4().setPosition(0, 0.210, 0);
  const invHeadBoneMatrix = (headBone as THREE.Bone).matrixWorld.clone().invert();
  const localMatrix = new THREE.Matrix4().multiplyMatrices(invHeadBoneMatrix, targetWorldMatrix);
  localMatrix.decompose(headGroup.position, headGroup.quaternion, headGroup.scale);

  // 4. 헤어 파츠 생성 및 부착
  const hairMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(hairColor),
    roughness: hairRoughness,
    metalness: 0.04,
  });
  const hairMesh = buildChibiHairMesh(hairMaterial);
  headGroup.add(hairMesh);

  // 5. 눈 (Eyes) & 눈 깜빡임 시스템 생성
  const openEyeTex = createEyeTexture(false);
  const closedEyeTex = createEyeTexture(true);

  const eyeGeo = new THREE.PlaneGeometry(0.040, 0.048);
  const leftEyeMat = new THREE.MeshBasicMaterial({
    map: openEyeTex,
    transparent: true,
    depthWrite: false,
  });
  const rightEyeMat = new THREE.MeshBasicMaterial({
    map: openEyeTex,
    transparent: true,
    depthWrite: false,
  });

  // 좌측 눈 (얼굴 곡면에 맞춰 살짝 외측 회전)
  const leftEye = new THREE.Mesh(eyeGeo, leftEyeMat);
  leftEye.position.set(-0.040, 0.098, 0.136);
  leftEye.rotation.set(0, -0.16, 0);
  headGroup.add(leftEye);

  // 우측 눈
  const rightEye = new THREE.Mesh(eyeGeo, rightEyeMat);
  rightEye.position.set(0.040, 0.098, 0.136);
  rightEye.rotation.set(0, 0.16, 0);
  headGroup.add(rightEye);

  // 6. 눈썹 (Eyebrows)
  if (showEyebrows) {
    const eyebrowTex = createEyebrowTexture();
    const eyebrowGeo = new THREE.PlaneGeometry(0.038, 0.020);
    const eyebrowMat = new THREE.MeshBasicMaterial({
      map: eyebrowTex,
      transparent: true,
      depthWrite: false,
    });

    const leftEyebrow = new THREE.Mesh(eyebrowGeo, eyebrowMat);
    leftEyebrow.position.set(-0.041, 0.126, 0.137);
    leftEyebrow.rotation.set(0, -0.16, -0.05);
    headGroup.add(leftEyebrow);

    const rightEyebrow = new THREE.Mesh(eyebrowGeo, eyebrowMat);
    rightEyebrow.position.set(0.041, 0.126, 0.137);
    rightEyebrow.rotation.set(0, 0.16, 0.05);
    headGroup.add(rightEyebrow);
  }

  // 7. 은은한 볼터치 홍조 (Cheek Blush)
  if (showBlush) {
    const blushTex = createBlushTexture();
    const blushGeo = new THREE.PlaneGeometry(0.044, 0.028);
    const blushMat = new THREE.MeshBasicMaterial({
      map: blushTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    });

    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.position.set(-0.060, 0.076, 0.132);
    leftBlush.rotation.set(0, -0.32, -0.08);
    headGroup.add(leftBlush);

    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.position.set(0.060, 0.076, 0.132);
    rightBlush.rotation.set(0, 0.32, 0.08);
    headGroup.add(rightBlush);
  }

  // 8. 앙증맞은 작은 입 (Mouth)
  if (showMouth) {
    const mouthTex = createMouthTexture();
    const mouthGeo = new THREE.PlaneGeometry(0.026, 0.016);
    const mouthMat = new THREE.MeshBasicMaterial({
      map: mouthTex,
      transparent: true,
      depthWrite: false,
    });

    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, 0.056, 0.137);
    headGroup.add(mouth);
  }

  // =========================================================================
  // 자연스러운 눈 깜빡임 타이머 컨트롤러
  // =========================================================================
  let nextBlinkTime = 2.0 + Math.random() * (blinkInterval[1] - blinkInterval[0]);
  let timeUntilNextBlink = nextBlinkTime;
  let isBlinking = false;
  let blinkTimer = 0;
  const BLINK_DURATION = 0.14; // 깜빡임 총 소요시간 140ms (빠르고 자연스러운 눈 깜빡임)

  const update = (dt: number) => {
    if (!isBlinking) {
      timeUntilNextBlink -= dt;
      if (timeUntilNextBlink <= 0) {
        isBlinking = true;
        blinkTimer = 0;
      }
    } else {
      blinkTimer += dt;
      const progress = blinkTimer / BLINK_DURATION;

      if (progress < 1.0) {
        // 눈 감았다 뜨기 (Sine 곡선으로 scale.y 수축)
        const closeFactor = Math.sin(progress * Math.PI);
        const scaleY = Math.max(0.08, 1.0 - closeFactor * 0.92);
        leftEye.scale.y = scaleY;
        rightEye.scale.y = scaleY;

        // 눈이 거의 감겼을 때는 감은 눈 텍스처(속눈썹 호)로 자연스럽게 스왑
        const useClosed = closeFactor > 0.55;
        if (leftEyeMat.map !== (useClosed ? closedEyeTex : openEyeTex)) {
          leftEyeMat.map = useClosed ? closedEyeTex : openEyeTex;
          rightEyeMat.map = useClosed ? closedEyeTex : openEyeTex;
          leftEyeMat.needsUpdate = true;
          rightEyeMat.needsUpdate = true;
        }
      } else {
        // 깜빡임 완료 -> 완전 개안 복원
        isBlinking = false;
        leftEye.scale.y = 1.0;
        rightEye.scale.y = 1.0;
        leftEyeMat.map = openEyeTex;
        rightEyeMat.map = openEyeTex;
        leftEyeMat.needsUpdate = true;
        rightEyeMat.needsUpdate = true;
        // 다음 깜빡임 간격 랜덤 재계산 (너무 자주 깜빡이지 않도록 3.5s ~ 6.0s)
        timeUntilNextBlink =
          blinkInterval[0] + Math.random() * (blinkInterval[1] - blinkInterval[0]);
      }
    }
  };

  return {
    update,
    hairMaterial,
    skinMaterial,
  };
}
