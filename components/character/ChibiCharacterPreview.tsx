'use client';

import { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import Link from 'next/link';
import {
  setupChibiCharacterStyling,
  ChibiFaceController,
  ChibiCustomizationOptions,
} from './chibiParts';
import {
  getCharacterCustomization,
  saveCharacterCustomization,
  resetCharacterCustomization,
} from '@/lib/storage/characterStorage';
import { computeActionPose } from '@/lib/animation/characterActionPose';

type MotionMode =
  | 'static'
  | 'idle'
  | 'walk'
  | 'jump'
  | 'standing_pray'
  | 'sitting_idle'
  | 'sitting_pray'
  | 'kneeling_idle'
  | 'kneeling_pray'
  | 'wave'
  | 'bow';
type CameraAnglePreset = 'front' | 'quarter' | 'side' | 'back' | 'custom';

interface BoneEntry {
  bone: THREE.Bone;
  restQuat: THREE.Quaternion;
}
type BoneMap = Record<string, BoneEntry>;

const scratchEuler = new THREE.Euler(0, 0, 0, 'XYZ');
const scratchQuat = new THREE.Quaternion();
const scratchTargetQuat = new THREE.Quaternion();

function applyBoneRotation(
  entry: BoneEntry | undefined,
  x: number,
  y: number,
  z: number,
  slerpAlpha = 1.0
) {
  if (!entry) return;
  scratchEuler.set(x, y, z, 'XYZ');
  scratchQuat.setFromEuler(scratchEuler);
  scratchTargetQuat.copy(entry.restQuat).multiply(scratchQuat);
  if (slerpAlpha >= 1.0) {
    entry.bone.quaternion.copy(scratchTargetQuat);
  } else {
    entry.bone.quaternion.slerp(scratchTargetQuat, slerpAlpha);
  }
}

// ---------------------------------------------------------------------------
// 3D 치비 모델 프리뷰 컴포넌트
// ---------------------------------------------------------------------------
function ChibiPreviewModel({
  wireframe,
  showSkeleton,
  autoRotate,
  motionMode,
  customization,
}: {
  wireframe: boolean;
  showSkeleton: boolean;
  autoRotate: boolean;
  motionMode: MotionMode;
  customization: ChibiCustomizationOptions;
}) {
  const { scene } = useGLTF('/character/chibi.glb');
  const groupRef = useRef<THREE.Group>(null);
  const skeletonHelperRef = useRef<THREE.SkeletonHelper | null>(null);
  const faceControllerRef = useRef<ChibiFaceController | null>(null);

  // 애니메이션 타이머
  const timerRef = useRef(0);

  // 캐릭터 독립 클론 및 1단계 스타일링 파츠 부착
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // 1단계 외형 리디자인: 피부, 3D 헤어 볼륨, 반짝이는 눈 & 눈깜빡임, 볼터치, 미소 입
    faceControllerRef.current = setupChibiCharacterStyling(clone, customization);

    return clone;
  }, [scene, customization]);

  // 본 맵 캐싱
  const bones = useMemo<BoneMap>(() => {
    const map: BoneMap = {};
    clonedScene.traverse((child: any) => {
      if (child.isBone) {
        map[child.name] = {
          bone: child,
          restQuat: child.quaternion.clone(),
        };
      }
    });
    return map;
  }, [clonedScene]);

  // 와이어프레임 토글 처리
  useEffect(() => {
    clonedScene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat: any) => {
            mat.wireframe = wireframe;
          });
        } else {
          child.material.wireframe = wireframe;
        }
      }
    });
  }, [clonedScene, wireframe]);

  // 스켈레톤 헬퍼
  useEffect(() => {
    if (showSkeleton && groupRef.current) {
      const helper = new THREE.SkeletonHelper(clonedScene);
      skeletonHelperRef.current = helper;
    } else {
      skeletonHelperRef.current = null;
    }
  }, [showSkeleton, clonedScene]);

  // 실시간 모션 & 얼굴 표정 업데이트 루프
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    timerRef.current += dt;
    const t = timerRef.current;

    // 1. 얼굴 표정 & 자연스러운 눈 깜빡임 (모든 모션 모드에서 유기적 작동)
    if (faceControllerRef.current) {
      faceControllerRef.current.update(dt);
    }

    // 2. 자동 회전
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += dt * 0.55;
    }

    // 3. 관절 모션 적용
    if (motionMode === 'static') {
      // A-Pose 정지 자세 (기본 Rest 자세 복원)
      Object.values(bones).forEach((entry) => {
        entry.bone.quaternion.copy(entry.restQuat);
      });
      if (groupRef.current) groupRef.current.position.y = 0;
      return;
    }

    if (
      motionMode === 'standing_pray' ||
      motionMode === 'sitting_idle' ||
      motionMode === 'sitting_pray' ||
      motionMode === 'kneeling_idle' ||
      motionMode === 'kneeling_pray' ||
      motionMode === 'wave' ||
      motionMode === 'bow'
    ) {
      const breathPhase = t * 2.1;
      const breath = Math.sin(breathPhase);
      const sway = Math.sin(t * 1.05);
      const loopTime = motionMode === 'wave' || motionMode === 'bow' ? t % 2.5 : t;
      const pose = computeActionPose(motionMode as any, loopTime, t, breath, sway);

      if (faceControllerRef.current) {
        faceControllerRef.current.update(dt, pose.isPraying);
      }

      const boneSlerp = Math.min(dt * 20.0, 1.0);

      applyBoneRotation(bones['Left_Shoulder_016'], ...pose.leftShoulder, boneSlerp);
      applyBoneRotation(bones['RightShoulder_08'], ...pose.rightShoulder, boneSlerp);

      applyBoneRotation(bones['Left_Arm_017'], ...pose.leftArm, boneSlerp);
      applyBoneRotation(bones['RightArm_09'], ...pose.rightArm, boneSlerp);
      applyBoneRotation(bones['Left_ForeArm_018'], ...pose.leftForearm, boneSlerp);
      applyBoneRotation(bones['RightForeArm_010'], ...pose.rightForearm, boneSlerp);

      applyBoneRotation(bones['Left_Hand_019'], ...pose.leftHand, boneSlerp);
      applyBoneRotation(bones['RightHand_011'], ...pose.rightHand, boneSlerp);

      applyBoneRotation(bones['Left_UpLeg_00'], ...pose.leftThigh, boneSlerp);
      applyBoneRotation(bones['RightUpLeg_024'], ...pose.rightThigh, boneSlerp);
      applyBoneRotation(bones['Left_Leg_028'], ...pose.leftKnee, boneSlerp);
      applyBoneRotation(bones['RightLeg_025'], ...pose.rightKnee, boneSlerp);
      applyBoneRotation(bones['Left_Foot_029'], ...pose.leftFoot, boneSlerp);
      applyBoneRotation(bones['RightFoot_026'], ...pose.rightFoot, boneSlerp);

      applyBoneRotation(bones['Hips_01'], ...pose.hips, boneSlerp);
      applyBoneRotation(bones['Spine_02'], ...pose.spine, boneSlerp);
      applyBoneRotation(bones['Spine1_03'], ...pose.spine1, boneSlerp);
      applyBoneRotation(bones['Spine2_04'], ...pose.spine2, boneSlerp);
      applyBoneRotation(bones['Neck_05'], ...pose.neck, boneSlerp);
      applyBoneRotation(bones['Head_06'], ...pose.head, boneSlerp);

      if (groupRef.current) {
        groupRef.current.position.y = THREE.MathUtils.lerp(
          groupRef.current.position.y,
          pose.meshOffsetY,
          Math.min(dt * 14.0, 1.0)
        );
      }
      return;
    }

    if (groupRef.current) {
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        0,
        Math.min(dt * 14.0, 1.0)
      );
    }

    const previewSlerp = Math.min(dt * 20.0, 1.0);

    if (motionMode === 'idle') {
      // 자연스러운 정지 대기: 호흡, 은은한 스웨이, 고개 끄덕임, 옆구리로 내려놓은 팔
      const breathPhase = t * 2.1;
      const breath = Math.sin(breathPhase);
      const sway = Math.sin(t * 1.05);

      // 다리 & 발 (바닥에 편안하게 접지)
      applyBoneRotation(bones['Left_UpLeg_00'], 0, 0, 0, previewSlerp);
      applyBoneRotation(bones['RightUpLeg_024'], 0, 0, 0, previewSlerp);
      applyBoneRotation(bones['Left_Leg_028'], 0, 0, 0, previewSlerp);
      applyBoneRotation(bones['RightLeg_025'], 0, 0, 0, previewSlerp);
      applyBoneRotation(bones['Left_Foot_029'], 0, 0, 0, previewSlerp);
      applyBoneRotation(bones['RightFoot_026'], 0, 0, 0, previewSlerp);

      // 어깨 및 손목 중립
      applyBoneRotation(bones['Left_Shoulder_016'], 0, 0, 0, previewSlerp);
      applyBoneRotation(bones['RightShoulder_08'], 0, 0, 0, previewSlerp);
      applyBoneRotation(bones['Left_Hand_019'], 0, 0, 0, previewSlerp);
      applyBoneRotation(bones['RightHand_011'], 0, 0, 0, previewSlerp);

      // 팔: 양옆으로 자연스럽게 내리고 편안하게 호흡에 맞춰 흔들림
      const leftArmIdleZ = 0.82 + sway * 0.015;
      const rightArmIdleZ = -0.82 - sway * 0.015;
      const leftArmIdleY = -breath * 0.015;
      const rightArmIdleY = breath * 0.015;
      applyBoneRotation(bones['Left_Arm_017'], 0, leftArmIdleY, leftArmIdleZ);
      applyBoneRotation(bones['RightArm_09'], 0, rightArmIdleY, rightArmIdleZ);

      // 팔꿈치 안쪽으로 살짝 모으기
      applyBoneRotation(bones['Left_ForeArm_018'], 0, -0.12 + breath * 0.01, 0);
      applyBoneRotation(bones['RightForeArm_010'], 0, 0.12 - breath * 0.01, 0);

      // 골반 & 척추
      applyBoneRotation(bones['Hips_01'], 0, sway * 0.015, breath * 0.008);
      applyBoneRotation(bones['Spine_02'], 0, -sway * 0.010, breath * 0.020);
      applyBoneRotation(bones['Spine1_03'], 0, 0, breath * 0.008);
      applyBoneRotation(bones['Spine2_04'], 0, 0, breath * 0.008);

      // 목 & 머리 (헤어와 얼굴 파츠가 Head 본을 따라 자연스럽게 끄덕임)
      applyBoneRotation(bones['Neck_05'], 0, sway * 0.008, -breath * 0.012);
      applyBoneRotation(bones['Head_06'], Math.cos(t * 0.8) * 0.02, 0, -breath * 0.010);
    } else if (motionMode === 'walk') {
      // 어깨 및 손목 중립
      applyBoneRotation(bones['Left_Shoulder_016'], 0, 0, 0, previewSlerp);
      applyBoneRotation(bones['RightShoulder_08'], 0, 0, 0, previewSlerp);
      applyBoneRotation(bones['Left_Hand_019'], 0, 0, 0, previewSlerp);
      applyBoneRotation(bones['RightHand_011'], 0, 0, 0, previewSlerp);

      // 씩씩한 제자리 걷기 모션
      const walkSpeed = 9.0;
      const phase = t * walkSpeed;
      const legCycle = Math.sin(phase);
      const cosCycle = Math.cos(phase);

      // 다리 관절 교차 보행
      applyBoneRotation(bones['Left_UpLeg_00'], 0, 0, legCycle * 0.48);
      applyBoneRotation(bones['RightUpLeg_024'], 0, 0, -legCycle * 0.48);

      const leftKneeZ = Math.max(0, legCycle) * 0.65 + Math.max(0, -cosCycle) * 0.20;
      const rightKneeZ = Math.max(0, -legCycle) * 0.65 + Math.max(0, cosCycle) * 0.20;
      applyBoneRotation(bones['Left_Leg_028'], 0, 0, leftKneeZ);
      applyBoneRotation(bones['RightLeg_025'], 0, 0, rightKneeZ);

      const leftFootZ = Math.max(0, legCycle) * 0.35 - Math.max(0, -legCycle) * 0.20;
      const rightFootZ = Math.max(0, -legCycle) * 0.35 - Math.max(0, legCycle) * 0.20;
      applyBoneRotation(bones['Left_Foot_029'], 0, 0, leftFootZ);
      applyBoneRotation(bones['RightFoot_026'], 0, 0, rightFootZ);

      // 팔 관절: 내려진 팔을 축으로 보폭에 맞춰 전후 역위상 스윙
      const walkClearance = Math.abs(legCycle) * 0.04;
      const armWalkY = -legCycle * 0.45;
      applyBoneRotation(bones['Left_Arm_017'], 0, armWalkY, 0.82 - walkClearance);
      applyBoneRotation(bones['RightArm_09'], 0, armWalkY, -0.82 + walkClearance);

      const leftForearmWalkY = -0.15 - Math.max(0, legCycle) * 0.25;
      const rightForearmWalkY = 0.15 + Math.max(0, -legCycle) * 0.25;
      applyBoneRotation(bones['Left_ForeArm_018'], 0, leftForearmWalkY, 0);
      applyBoneRotation(bones['RightForeArm_010'], 0, rightForearmWalkY, 0);

      // 골반 리듬 & 척추 바운스
      applyBoneRotation(bones['Hips_01'], legCycle * 0.06, cosCycle * 0.04, 0.04);
      applyBoneRotation(bones['Spine_02'], -legCycle * 0.05, 0, 0.06);
      applyBoneRotation(bones['Spine1_03'], 0, 0, 0);
      applyBoneRotation(bones['Spine2_04'], 0, 0, 0);

      // 고개 끄덕임
      applyBoneRotation(bones['Neck_05'], 0, 0, -0.04);
      applyBoneRotation(bones['Head_06'], 0, 0, Math.abs(cosCycle) * 0.025);
    } else if (motionMode === 'jump') {
      // 어깨 및 손목 중립
      applyBoneRotation(bones['Left_Shoulder_016'], 0, 0, 0, previewSlerp);
      applyBoneRotation(bones['RightShoulder_08'], 0, 0, 0, previewSlerp);
      applyBoneRotation(bones['Left_Hand_019'], 0, 0, 0, previewSlerp);
      applyBoneRotation(bones['RightHand_011'], 0, 0, 0, previewSlerp);

      // 귀여운 공중 체공 점프 포즈
      // 양다리 살짝 모으고 무릎 뒤로 접기
      applyBoneRotation(bones['Left_UpLeg_00'], 0, 0, -0.22);
      applyBoneRotation(bones['RightUpLeg_024'], 0, 0, -0.22);
      applyBoneRotation(bones['Left_Leg_028'], 0, 0, 0.45);
      applyBoneRotation(bones['RightLeg_025'], 0, 0, 0.45);
      applyBoneRotation(bones['Left_Foot_029'], 0, 0, 0.25);
      applyBoneRotation(bones['RightFoot_026'], 0, 0, 0.25);

      // 양팔 활짝 들어 균형 잡기
      applyBoneRotation(bones['Left_Arm_017'], 0, -0.15, 0.28);
      applyBoneRotation(bones['RightArm_09'], 0, 0.15, -0.28);
      applyBoneRotation(bones['Left_ForeArm_018'], 0, -0.28, 0);
      applyBoneRotation(bones['RightForeArm_010'], 0, 0.28, 0);

      // 가슴 펴고 시선 성당 천장으로 올려다보기
      applyBoneRotation(bones['Hips_01'], 0, 0, -0.06);
      applyBoneRotation(bones['Spine_02'], 0, 0, -0.08);
      applyBoneRotation(bones['Neck_05'], 0, 0, -0.10);
      applyBoneRotation(bones['Head_06'], 0, 0, 0.14);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <primitive object={clonedScene} />
      {showSkeleton && skeletonHelperRef.current && (
        <primitive object={skeletonHelperRef.current} />
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// 카메라 프리셋 제어기
// ---------------------------------------------------------------------------
function CameraPresetController({
  preset,
  onUserOrbit,
}: {
  preset: CameraAnglePreset;
  onUserOrbit: () => void;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  const targetPos = useMemo(() => {
    switch (preset) {
      case 'front':
        return new THREE.Vector3(0, 0.30, 1.25);
      case 'quarter':
        return new THREE.Vector3(0.75, 0.36, 0.95);
      case 'side':
        return new THREE.Vector3(1.25, 0.30, 0);
      case 'back':
        return new THREE.Vector3(0, 0.35, -1.25);
      default:
        return null;
    }
  }, [preset]);

  useFrame((_, delta) => {
    if (targetPos) {
      camera.position.lerp(targetPos, Math.min(1, delta * 6.5));
      if (controlsRef.current) {
        controlsRef.current.update();
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, 0.24, 0]}
      minDistance={0.4}
      maxDistance={3.5}
      maxPolarAngle={Math.PI / 2 + 0.05}
      enableDamping
      dampingFactor={0.05}
      onStart={onUserOrbit}
    />
  );
}

// 로딩 폴백
function Loader() {
  return (
    <mesh position={[0, 0.24, 0]}>
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      <meshStandardMaterial color="#f59e0b" wireframe />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// 메인 캐릭터 프리뷰 컴포넌트
// ---------------------------------------------------------------------------
export default function ChibiCharacterPreview() {
  // 모션 모드 (대기, 걷기, 점프, 정지)
  const [motionMode, setMotionMode] = useState<MotionMode>('idle');

  // 카메라 각도 프리셋
  const [cameraAngle, setCameraAngle] = useState<CameraAnglePreset>('quarter');

  // 스타일 커스터마이징 상태
  const [skinColor, setSkinColor] = useState('#fcdcc5'); // 따뜻한 자연 베이지
  const [hairColor, setHairColor] = useState('#382319'); // 다크 브라운
  const [showHair, setShowHair] = useState(false);      // 머리카락 기본 삭제 (치비 민머리)
  const [eyeStyle, setEyeStyle] = useState<'original' | 'sparkle'>('original'); // 눈 스타일 (기본값: 기존 오리지널 눈)
  const [showEyebrows, setShowEyebrows] = useState(true);
  const [showBlush, setShowBlush] = useState(true);
  const [showMouth, setShowMouth] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 뷰어 검사 모드 설정
  const [wireframe, setWireframe] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [hasError, setHasError] = useState(false);

  // 로컬 스토리지에 저장된 사용자 캐릭터 외형 불러오기
  useEffect(() => {
    const saved = getCharacterCustomization();
    if (saved) {
      if (saved.skinColor) setSkinColor(saved.skinColor);
      if (saved.hairColor) setHairColor(saved.hairColor);
      if (typeof saved.showHair === 'boolean') setShowHair(saved.showHair);
      if (saved.eyeStyle) setEyeStyle(saved.eyeStyle);
      if (typeof saved.showEyebrows === 'boolean') setShowEyebrows(saved.showEyebrows);
      if (typeof saved.showBlush === 'boolean') setShowBlush(saved.showBlush);
      if (typeof saved.showMouth === 'boolean') setShowMouth(saved.showMouth);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const customizationOptions: ChibiCustomizationOptions = useMemo(
    () => ({
      skinColor,
      hairColor,
      showHair,
      eyeStyle,
      showEyebrows,
      showBlush,
      showMouth,
    }),
    [skinColor, hairColor, showHair, eyeStyle, showEyebrows, showBlush, showMouth]
  );

  const handleSave = () => {
    saveCharacterCustomization(customizationOptions);
    showToast('✨ 캐릭터 외형이 저장되었습니다! 성당 입장 시 자동으로 적용됩니다.');
  };

  const handleReset = () => {
    const def = resetCharacterCustomization();
    setSkinColor(def.skinColor || '#fcdcc5');
    setHairColor(def.hairColor || '#382319');
    setShowHair(false);
    setEyeStyle('original');
    setShowEyebrows(true);
    setShowBlush(true);
    setShowMouth(true);
    showToast('기본 외형으로 초기화되었습니다.');
  };

  return (
    <div className="relative w-screen h-screen bg-[#090a0f] overflow-hidden select-none font-sans">
      {/* Three.js R3F 3D 캔버스 */}
      {!hasError ? (
        <Canvas
          shadows={{ type: THREE.PCFSoftShadowMap }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.08,
            powerPreference: 'high-performance',
          }}
          camera={{ position: [0.75, 0.36, 0.95], fov: 45 }}
          className="w-full h-full"
        >
          {/* 심야 스튜디오 조명 배경 */}
          <color attach="background" args={['#0a0b12']} />
          <fog attach="fog" args={['#0a0b12', 2.5, 9]} />

          {/* 1. 앰비언트 라이트 */}
          <ambientLight intensity={0.45} color="#dbeafe" />

          {/* 2. 주광 (얼굴과 몸통을 따뜻하고 화사하게 비추는 키 라이트) */}
          <directionalLight
            position={[1.5, 2.5, 1.5]}
            intensity={1.9}
            color="#fffbeb"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-near={0.1}
            shadow-camera-far={10}
            shadow-camera-left={-1}
            shadow-camera-right={1}
            shadow-camera-top={1}
            shadow-camera-bottom={-1}
            shadow-bias={-0.0001}
            shadow-normalBias={0.035}
          />

          {/* 3. 보조광 (시원한 쿨톤 필 라이트) */}
          <directionalLight
            position={[-1.5, 1.5, -0.5]}
            intensity={0.7}
            color="#38bdf8"
          />

          {/* 4. 후광 림 라이트 (머리카락 엣지와 실루엣 강조) */}
          <pointLight
            position={[0, 1.5, -1.2]}
            intensity={2.2}
            color="#f59e0b"
            distance={4.5}
          />

          {/* 바닥 원형 접지 그리드 */}
          <gridHelper
            args={[3, 30, '#334155', '#1e293b']}
            position={[0, -0.001, 0]}
          />

          {/* 그림자 바닥 플레인 */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.002, 0]}
            receiveShadow
          >
            <planeGeometry args={[6, 6]} />
            <shadowMaterial opacity={0.45} />
          </mesh>

          {/* 캐릭터 모델 (Suspense 로딩) */}
          <Suspense fallback={<Loader />}>
            <ChibiPreviewModel
              wireframe={wireframe}
              showSkeleton={showSkeleton}
              autoRotate={autoRotate}
              motionMode={motionMode}
              customization={customizationOptions}
            />
          </Suspense>

          {/* 카메라 컨트롤러 */}
          <CameraPresetController
            preset={cameraAngle}
            onUserOrbit={() => setCameraAngle('custom')}
          />
        </Canvas>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-lg font-light text-stone-200">
            모델을 불러오지 못했습니다
          </h2>
          <button
            onClick={() => setHasError(false)}
            className="mt-4 px-4 py-2 rounded-xl bg-stone-800 text-xs text-stone-300 hover:text-white"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* ========================================================
          상단 네비게이션 헤더
          ======================================================== */}
      <header className="absolute top-5 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-stone-800 bg-stone-900/80 backdrop-blur-md px-3.5 py-1.5 text-xs text-stone-300 hover:text-white transition-all active:scale-95 shadow-lg"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>홈으로</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900/60 border border-stone-800 text-[11px] text-stone-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-medium text-stone-200">캐릭터 디자인 1단계</span>
            <span className="text-stone-500">|</span>
            <span>기본 외형 & 얼굴 리디자인</span>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
              showInfo
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10'
                : 'bg-stone-900/70 text-stone-400 border-stone-800 hover:text-stone-200'
            }`}
          >
            {showInfo ? '스펙 리포트 닫기' : '리디자인 스펙 보기'}
          </button>
        </div>
      </header>

      {/* ========================================================
          좌측 조작 패널: 모션 모드 & 카메라 앵글 & 커스터마이징
          ======================================================== */}
      <aside className="absolute top-20 left-6 z-20 w-64 max-h-[calc(100vh-140px)] overflow-y-auto space-y-3 pointer-events-auto text-xs font-light">
        {/* 1. 동작 모션 선택 */}
        <div className="rounded-2xl border border-stone-800/80 bg-stone-950/85 backdrop-blur-xl p-4 shadow-xl">
          <span className="text-[11px] font-medium text-amber-400 block mb-2.5">
            🎬 기본 동작 테스트
          </span>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            <button
              onClick={() => setMotionMode('idle')}
              className={`px-2 py-1.5 rounded-xl text-center text-xs transition-all ${
                motionMode === 'idle'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 font-medium'
                  : 'bg-stone-900/70 text-stone-400 border border-stone-800/60 hover:text-stone-200'
              }`}
            >
              대기 (Idle)
            </button>
            <button
              onClick={() => setMotionMode('walk')}
              className={`px-2 py-1.5 rounded-xl text-center text-xs transition-all ${
                motionMode === 'walk'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 font-medium'
                  : 'bg-stone-900/70 text-stone-400 border border-stone-800/60 hover:text-stone-200'
              }`}
            >
              걷기 (Walk)
            </button>
            <button
              onClick={() => setMotionMode('jump')}
              className={`px-2 py-1.5 rounded-xl text-center text-xs transition-all ${
                motionMode === 'jump'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 font-medium'
                  : 'bg-stone-900/70 text-stone-400 border border-stone-800/60 hover:text-stone-200'
              }`}
            >
              점프 (Jump)
            </button>
            <button
              onClick={() => setMotionMode('static')}
              className={`px-2 py-1.5 rounded-xl text-center text-xs transition-all ${
                motionMode === 'static'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 font-medium'
                  : 'bg-stone-900/70 text-stone-400 border border-stone-800/60 hover:text-stone-200'
              }`}
            >
              정지 (A-Pose)
            </button>
          </div>

          <span className="text-[11px] font-medium text-emerald-400 block mb-2">
            ⛪ 예배 & 상호작용 행동
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setMotionMode('standing_pray')}
              className={`px-2 py-1.5 rounded-xl text-center text-xs transition-all ${
                motionMode === 'standing_pray'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-medium'
                  : 'bg-stone-900/70 text-stone-400 border border-stone-800/60 hover:text-stone-200'
              }`}
            >
              🕊️ 서서 기도
            </button>
            <button
              onClick={() => setMotionMode('sitting_idle')}
              className={`px-2 py-1.5 rounded-xl text-center text-xs transition-all ${
                motionMode === 'sitting_idle'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-medium'
                  : 'bg-stone-900/70 text-stone-400 border border-stone-800/60 hover:text-stone-200'
              }`}
            >
              🪑 의자 앉기
            </button>
            <button
              onClick={() => setMotionMode('sitting_pray')}
              className={`px-2 py-1.5 rounded-xl text-center text-xs transition-all ${
                motionMode === 'sitting_pray'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-medium'
                  : 'bg-stone-900/70 text-stone-400 border border-stone-800/60 hover:text-stone-200'
              }`}
            >
              🙏 앉아서 기도
            </button>
            <button
              onClick={() => setMotionMode('kneeling_idle')}
              className={`px-2 py-1.5 rounded-xl text-center text-xs transition-all ${
                motionMode === 'kneeling_idle'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-medium'
                  : 'bg-stone-900/70 text-stone-400 border border-stone-800/60 hover:text-stone-200'
              }`}
            >
              🛐 무릎 꿇기
            </button>
            <button
              onClick={() => setMotionMode('kneeling_pray')}
              className={`px-2 py-1.5 rounded-xl text-center text-xs transition-all ${
                motionMode === 'kneeling_pray'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 font-medium'
                  : 'bg-stone-900/70 text-stone-400 border border-stone-800/60 hover:text-stone-200'
              }`}
            >
              ✨ 무릎 기도
            </button>
            <button
              onClick={() => setMotionMode('wave')}
              className={`px-2 py-1.5 rounded-xl text-center text-xs transition-all ${
                motionMode === 'wave'
                  ? 'bg-sky-500/25 text-sky-300 border border-sky-500/40 font-medium'
                  : 'bg-stone-900/70 text-stone-400 border border-stone-800/60 hover:text-stone-200'
              }`}
            >
              🙋 손 흔들기
            </button>
            <button
              onClick={() => setMotionMode('bow')}
              className={`col-span-2 px-2 py-1.5 rounded-xl text-center text-xs transition-all ${
                motionMode === 'bow'
                  ? 'bg-sky-500/25 text-sky-300 border border-sky-500/40 font-medium'
                  : 'bg-stone-900/70 text-stone-400 border border-stone-800/60 hover:text-stone-200'
              }`}
            >
              🙇 공손한 인사 (Bow)
            </button>
          </div>
          <p className="mt-2 text-[10px] text-stone-500">
            ※ 기도 중에는 경건하게 두 손을 모으고 눈을 감습니다.
          </p>
        </div>

        {/* 2. 카메라 시점 프리셋 */}
        <div className="rounded-2xl border border-stone-800/80 bg-stone-950/85 backdrop-blur-xl p-4 shadow-xl">
          <span className="text-[11px] font-medium text-sky-400 block mb-2.5">
            📐 시점 각도 프리셋
          </span>
          <div className="grid grid-cols-4 gap-1 text-[11px]">
            <button
              onClick={() => setCameraAngle('front')}
              className={`py-1.5 rounded-lg text-center transition-all ${
                cameraAngle === 'front'
                  ? 'bg-sky-500/25 text-sky-300 border border-sky-500/40'
                  : 'bg-stone-900/70 text-stone-400 border border-stone-800/60 hover:text-stone-200'
              }`}
            >
              정면
            </button>
            <button
              onClick={() => setCameraAngle('quarter')}
              className={`py-1.5 rounded-lg text-center transition-all ${
                cameraAngle === 'quarter'
                  ? 'bg-sky-500/25 text-sky-300 border border-sky-500/40'
                  : 'bg-stone-900/70 text-stone-400 border border-stone-800/60 hover:text-stone-200'
              }`}
            >
              45°
            </button>
            <button
              onClick={() => setCameraAngle('side')}
              className={`py-1.5 rounded-lg text-center transition-all ${
                cameraAngle === 'side'
                  ? 'bg-sky-500/25 text-sky-300 border border-sky-500/40'
                  : 'bg-stone-900/70 text-stone-400 border border-stone-800/60 hover:text-stone-200'
              }`}
            >
              측면
            </button>
            <button
              onClick={() => setCameraAngle('back')}
              className={`py-1.5 rounded-lg text-center transition-all ${
                cameraAngle === 'back'
                  ? 'bg-sky-500/25 text-sky-300 border border-sky-500/40'
                  : 'bg-stone-900/70 text-stone-400 border border-stone-800/60 hover:text-stone-200'
              }`}
            >
              후면
            </button>
          </div>
          <p className="mt-2 text-[10px] text-stone-500">
            후면 시점에서 정수리 돔과 목덜미 헤어 볼륨을 확인할 수 있습니다.
          </p>
        </div>

        {/* 3. 스타일 커스터마이징 및 로컬 저장 */}
        <div className="rounded-2xl border border-stone-800/80 bg-stone-950/85 backdrop-blur-xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-emerald-400 block">
              🎨 외형 커스텀 & 저장
            </span>
            <button
              onClick={handleReset}
              className="text-[10px] text-stone-500 hover:text-stone-300 transition-colors"
              title="초기 상태로 되돌리기"
            >
              초기화
            </button>
          </div>

          {/* 피부 톤 선택 */}
          <div>
            <span className="text-[10px] text-stone-400 block mb-1.5">피부 톤</span>
            <div className="flex items-center gap-2">
              {[
                { name: '따뜻한 베이지', color: '#fcdcc5' },
                { name: '복숭아 아이보리', color: '#ffebd9' },
                { name: '내추럴 샌드', color: '#edd0b6' },
                { name: '웜 탠', color: '#d49b78' },
              ].map((skin) => (
                <button
                  key={skin.color}
                  onClick={() => setSkinColor(skin.color)}
                  title={skin.name}
                  className={`w-6 h-6 rounded-full transition-transform border ${
                    skinColor === skin.color
                      ? 'scale-115 border-white ring-2 ring-emerald-400/50'
                      : 'border-stone-700 hover:scale-105'
                  }`}
                  style={{ backgroundColor: skin.color }}
                />
              ))}
            </div>
          </div>

          {/* 눈 모양 선택 (기존 오리지널 3D 눈 vs 반짝이 눈) */}
          <div className="pt-2 border-t border-stone-800/60">
            <span className="text-[10px] text-stone-400 block mb-1.5">눈 스타일</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setEyeStyle('original')}
                className={`py-1.5 px-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 ${
                  eyeStyle === 'original'
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 font-medium shadow-md'
                    : 'bg-stone-900/70 text-stone-400 border border-stone-800/60 hover:text-stone-200'
                }`}
              >
                <span>👀</span>
                <span>기존 오리지널 눈</span>
              </button>
              <button
                type="button"
                onClick={() => setEyeStyle('sparkle')}
                className={`py-1.5 px-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 ${
                  eyeStyle === 'sparkle'
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 font-medium shadow-md'
                    : 'bg-stone-900/70 text-stone-400 border border-stone-800/60 hover:text-stone-200'
                }`}
              >
                <span>✨</span>
                <span>반짝이 눈</span>
              </button>
            </div>
          </div>

          {/* 표정 요소 및 머리카락 온/오프 토글 */}
          <div className="pt-2 border-t border-stone-800/60 space-y-1.5 text-[11px]">
            <label className="flex items-center justify-between text-stone-400 cursor-pointer">
              <span>눈썹 (Eyebrows)</span>
              <input
                type="checkbox"
                checked={showEyebrows}
                onChange={(e) => setShowEyebrows(e.target.checked)}
                className="rounded accent-emerald-500 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between text-stone-400 cursor-pointer">
              <span>볼터치 홍조 (Blush)</span>
              <input
                type="checkbox"
                checked={showBlush}
                onChange={(e) => setShowBlush(e.target.checked)}
                className="rounded accent-emerald-500 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between text-stone-400 cursor-pointer">
              <span>미소 입 (Mouth)</span>
              <input
                type="checkbox"
                checked={showMouth}
                onChange={(e) => setShowMouth(e.target.checked)}
                className="rounded accent-emerald-500 cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between text-stone-400 cursor-pointer pt-1 border-t border-stone-800/40">
              <span className="flex items-center gap-1">
                <span>머리카락 표시</span>
                <span className="text-[9px] text-stone-500">(기본: 민머리)</span>
              </span>
              <input
                type="checkbox"
                checked={showHair}
                onChange={(e) => setShowHair(e.target.checked)}
                className="rounded accent-emerald-500 cursor-pointer"
              />
            </label>

            {/* 머리카락 표시가 켜진 경우에만 헤어 컬러 선택기 노출 */}
            {showHair && (
              <div className="pt-1.5 animate-fade-in">
                <span className="text-[10px] text-stone-400 block mb-1">헤어 컬러</span>
                <div className="flex items-center gap-1.5">
                  {[
                    { name: '다크 브라운', color: '#382319' },
                    { name: '밀크 초코', color: '#543220' },
                    { name: '미드나잇 블랙', color: '#1c1622' },
                    { name: '골든 허니', color: '#8f5832' },
                  ].map((hair) => (
                    <button
                      key={hair.color}
                      onClick={() => setHairColor(hair.color)}
                      title={hair.name}
                      className={`w-5 h-5 rounded-full transition-transform border ${
                        hairColor === hair.color
                          ? 'scale-115 border-white ring-2 ring-emerald-400/50'
                          : 'border-stone-700 hover:scale-105'
                      }`}
                      style={{ backgroundColor: hair.color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 저장 버튼 (localStorage 영구 보관 & 성당 자동 반영) */}
          <div className="pt-2 border-t border-stone-800/60 space-y-2">
            <button
              onClick={handleSave}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-medium text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <span>💾</span>
              <span>이 모습으로 저장하기</span>
            </button>

            {/* 성당 바로가기 링크 */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <Link
                href="/private-prayer"
                className="py-1.5 rounded-lg text-center text-[10px] bg-stone-900/80 hover:bg-stone-800 text-amber-300/90 border border-amber-500/30 transition-all"
              >
                🕯️ 개인 기도실
              </Link>
              <Link
                href="/community-prayer"
                className="py-1.5 rounded-lg text-center text-[10px] bg-stone-900/80 hover:bg-stone-800 text-sky-300/90 border border-sky-500/30 transition-all"
              >
                🏛️ 공동 기도실
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================
          우측 모델 스펙 & 1단계 리디자인 보고서 패널
          ======================================================== */}
      {showInfo && (
        <aside className="absolute top-20 right-6 z-20 w-84 max-h-[calc(100vh-140px)] overflow-y-auto rounded-2xl border border-stone-800/80 bg-stone-950/85 backdrop-blur-xl p-5 text-xs shadow-2xl pointer-events-auto">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <h3 className="font-medium text-stone-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>1단계 외형 리디자인 리포트</span>
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono">Stage 1 Active</span>
          </div>

          <div className="mt-4 space-y-3 font-light text-stone-400">
            {/* 1. 피부 톤 개선 */}
            <div className="rounded-xl bg-stone-900/60 p-3 border border-stone-800/60">
              <span className="text-[11px] text-amber-400 font-medium block mb-1.5">
                ✨ 피부 톤 (Skin Tone)
              </span>
              <div className="flex items-center justify-between text-stone-300 mb-1">
                <span>기존 단색</span>
                <span className="text-red-400 line-through">보라/핑크 (#ffa9fb)</span>
              </div>
              <div className="flex items-center justify-between text-stone-300">
                <span>리디자인</span>
                <span className="text-emerald-400 font-medium">따뜻한 자연 베이지 (#fcdcc5)</span>
              </div>
              <p className="mt-2 text-[10px] text-stone-500 leading-relaxed">
                PBR Standard 머티리얼(거칠기 0.70)을 적용하여 성당의 따뜻한 촛불 및 스테인드글라스 조명과 포근하게 어우러집니다.
              </p>
            </div>

            {/* 2. 눈 & 깜빡임 시스템 */}
            <div className="rounded-xl bg-stone-900/60 p-3 border border-stone-800/60">
              <span className="text-[11px] text-sky-400 font-medium block mb-1.5">
                👀 치비 눈 & 눈 깜빡임 (Eyes & Blink)
              </span>
              <ul className="space-y-1 text-stone-300 text-[11px]">
                <li className="flex justify-between">
                  <span>안구 메시 교체</span>
                  <span className="text-sky-300">신규 입체 눈 시스템</span>
                </li>
                <li className="flex justify-between">
                  <span>동공 베이스</span>
                  <span className="text-stone-300">깊은 에스프레소 브라운</span>
                </li>
                <li className="flex justify-between">
                  <span>하이라이트</span>
                  <span className="text-amber-300">선명한 듀얼 스페큘러</span>
                </li>
                <li className="flex justify-between">
                  <span>깜빡임 주기</span>
                  <span className="text-emerald-400">3.5초 ~ 6.0초 (140ms 소요)</span>
                </li>
              </ul>
              <p className="mt-2 text-[10px] text-stone-500 leading-relaxed">
                눈 감김 시 귀여운 호선 텍스처로 자동 전환되며 자연스러운 감정 표현을 전달합니다.
              </p>
            </div>

            {/* 3. 얼굴 디테일 */}
            <div className="rounded-xl bg-stone-900/60 p-3 border border-stone-800/60">
              <span className="text-[11px] text-pink-400 font-medium block mb-1.5">
                🌸 표정 파츠 (Facial Features)
              </span>
              <ul className="space-y-1 text-[11px] text-stone-300">
                <li>• <strong>눈썹</strong>: 차분한 다크 브라운 아치형 눈썹</li>
                <li>• <strong>볼터치</strong>: 사랑스러운 코랄 핑크 방사형 그라데이션 (#fb7185)</li>
                <li>• <strong>입</strong>: 작고 부드러운 미소 라인 (#6f2d2d)</li>
              </ul>
            </div>

            {/* 4. 3D 볼륨 헤어 */}
            <div className="rounded-xl bg-stone-900/60 p-3 border border-stone-800/60">
              <span className="text-[11px] text-amber-300 font-medium block mb-1.5">
                💇 3D 볼륨 헤어 (Hair Styling)
              </span>
              <p className="text-[11px] text-stone-300 mb-2">
                기존 민자 대머리 형태를 벗어나 성당 분위기에 어울리는 단정한 치비 숏/단발 헤어 구현:
              </p>
              <ul className="space-y-1 text-[10px] text-stone-400">
                <li>• 정수리 돔 (Crown): 둥글고 풍성한 두상 실루엣</li>
                <li>• 3단 앞머리: 중앙 + 좌우 캡슐 클러스터 입체 배치</li>
                <li>• 옆머리 (Side): 볼을 감싸는 자연스러운 페이스 라인</li>
                <li>• 후두부/목덜미: 뒤통수 쉘 + 목덜미 볼륨 캡슐</li>
              </ul>
            </div>

            {/* 5. 골격 및 본 동기화 */}
            <div className="rounded-xl bg-stone-900/60 p-3 border border-stone-800/60">
              <span className="text-[11px] text-emerald-400 font-medium block mb-1.5">
                🦴 Skeleton 동기화 & 독립성
              </span>
              <div className="flex items-center justify-between text-stone-300 mb-1">
                <span>보존 본(Bone) 개수</span>
                <span className="font-mono text-emerald-400">32개 100% 보존</span>
              </div>
              <div className="flex items-center justify-between text-stone-300 mb-1">
                <span>머리 파츠 결합 본</span>
                <span className="font-mono text-sky-300">Head_06 (역행렬 래퍼)</span>
              </div>
              <p className="mt-1 text-[10px] text-stone-500 leading-relaxed">
                SkeletonUtils.clone으로 다중 접속 플레이어별 독립 스켈레톤 인스턴스를 유지하며 충돌과 애니메이션 물리 시스템과 완벽 호환됩니다.
              </p>
            </div>

            {/* 6. 2단계 의상 모듈화 아키텍처 준비 */}
            <div className="rounded-xl bg-stone-900/60 p-3 border border-stone-800/60">
              <span className="text-[11px] text-purple-400 font-medium block mb-1.5">
                👕 2단계 의상 모듈 인터페이스 준비
              </span>
              <p className="text-[10px] text-stone-400 leading-relaxed">
                `ChibiCustomizationOptions`에 상의(Top), 하의(Bottom), 신발(Shoes), 성물 액세서리(Accessories) 슬롯이 인터페이스로 기획되어 있어 차기 단계에서 매끄럽게 확장할 수 있습니다.
              </p>
            </div>
          </div>
        </aside>
      )}

      {/* ========================================================
          하단 뷰 컨트롤 바
          ======================================================== */}
      <footer className="absolute bottom-6 inset-x-6 z-20 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-stone-800/90 bg-stone-950/80 backdrop-blur-xl px-4 py-2.5 shadow-2xl">
          {/* 자동 회전 토글 */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-xl text-xs font-light transition-all ${
              autoRotate
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            {autoRotate ? '회전 일시정지' : '자동 회전'}
          </button>

          <div className="w-px h-4 bg-stone-800" />

          {/* 스켈레톤(본) 헬퍼 뷰어 토글 */}
          <button
            onClick={() => setShowSkeleton(!showSkeleton)}
            className={`px-3 py-1.5 rounded-xl text-xs font-light transition-all flex items-center gap-1.5 ${
              showSkeleton
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <span>🦴</span>
            <span>{showSkeleton ? '스켈레톤 숨기기' : '32본 스켈레톤 보기'}</span>
          </button>

          <div className="w-px h-4 bg-stone-800" />

          {/* 와이어프레임 토글 */}
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`px-3 py-1.5 rounded-xl text-xs font-light transition-all ${
              wireframe
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            {wireframe ? '솔리드 모드' : '와이어프레임'}
          </button>
        </div>
      </footer>

      {/* 좌측 하단 조작 가이드 */}
      <div className="absolute bottom-6 left-6 z-10 hidden md:block pointer-events-none text-[11px] text-stone-500 font-light bg-stone-950/50 backdrop-blur-sm p-3 rounded-xl border border-stone-900">
        <p>• 마우스 좌클릭 드래그: 360도 자유 회전</p>
        <p>• 마우스 휠 스크롤: 확대 / 축소</p>
        <p>• 마우스 우클릭 드래그: 시점 이동 (Pan)</p>
      </div>

      {/* 저장 완료 알림 토스트 */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 rounded-full border border-amber-500/30 bg-[#0d0f17]/95 backdrop-blur-md px-5 py-2.5 text-xs font-light text-amber-200 shadow-2xl animate-fade-in flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

useGLTF.preload('/character/chibi.glb');
