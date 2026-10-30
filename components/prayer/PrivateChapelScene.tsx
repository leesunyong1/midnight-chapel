'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Collider, RoomBounds } from './collisionUtils';
import {
  getStoneFloorTexture,
  getStoneWallTexture,
  getWoodTexture,
  getCarpetTexture,
  getStainedGlassLancetTexture,
  getMarbleTexture,
} from './proceduralTextures';

// -------------------------------------------------------------
// 개인 기도실 물리적 스펙 (12m × 16m × 7.5m) — 기존 충돌체 100% 유지
// -------------------------------------------------------------
export const PRIVATE_CHAPEL_BOUNDS: RoomBounds = {
  minX: -5.6,
  maxX: 5.6,
  minZ: -7.5,
  maxZ: 7.5,
};

export const PRIVATE_CHAPEL_COLLIDERS: Collider[] = [
  // 1. 대형 제단 단상 및 테이블 (X: -2.6 ~ +2.6, Z: -7.6 ~ -5.1)
  {
    type: 'box',
    minX: -2.6,
    maxX: 2.6,
    minZ: -7.6,
    maxZ: -5.1,
    name: 'Altar Platform & Table',
  },
  // 2. 개인 단독 기도대 (X: -0.65 ~ +0.65, Z: -4.1 ~ -3.3)
  {
    type: 'box',
    minX: -0.65,
    maxX: 0.65,
    minZ: -4.1,
    maxZ: -3.3,
    name: 'Single Private Prayer Kneeler',
  },
  // 3. 좌측 촛불 봉헌대 (X: -3.7 ~ -2.7, Z: -4.9 ~ -4.1)
  {
    type: 'box',
    minX: -3.7,
    maxX: -2.7,
    minZ: -4.9,
    maxZ: -4.1,
    name: 'West Votive Candle Stand',
  },
  // 4. 우측 촛불 봉헌대 (X: +2.7 ~ +3.7, Z: -4.9 ~ -4.1)
  {
    type: 'box',
    minX: 2.7,
    maxX: 3.7,
    minZ: -4.9,
    maxZ: -4.1,
    name: 'East Votive Candle Stand',
  },
  // 5. 측면 석조 기둥 (필라스터) 6개
  { type: 'cylinder', x: -5.6, z: -4.0, radius: 0.45, name: 'Pillar W1' },
  { type: 'cylinder', x: -5.6, z: 0.0, radius: 0.45, name: 'Pillar W2' },
  { type: 'cylinder', x: -5.6, z: 4.0, radius: 0.45, name: 'Pillar W3' },
  { type: 'cylinder', x: 5.6, z: -4.0, radius: 0.45, name: 'Pillar E1' },
  { type: 'cylinder', x: 5.6, z: 0.0, radius: 0.45, name: 'Pillar E2' },
  { type: 'cylinder', x: 5.6, z: 4.0, radius: 0.45, name: 'Pillar E3' },
];

// 깜빡이는 황동 촛대 & 촛불 (Brass Candle Holder & Flame)
function DetailedCandle({
  position,
  isLit = true,
  scale = 1,
}: {
  position: [number, number, number];
  isLit?: boolean;
  scale?: number;
}) {
  const lightRef = useRef<THREE.PointLight>(null);
  const flameRef = useRef<THREE.Mesh>(null);
  const offset = useRef(Math.random() * Math.PI * 2);

  useFrame((state) => {
    if (!isLit) return;
    const t = state.clock.elapsedTime * 6 + offset.current;
    const flicker = Math.sin(t) * 0.25 + Math.sin(t * 2.8) * 0.12;
    if (lightRef.current) {
      lightRef.current.intensity = 2.2 + flicker;
    }
    if (flameRef.current) {
      flameRef.current.scale.set(
        1 + flicker * 0.12,
        1 + flicker * 0.22,
        1 + flicker * 0.12
      );
    }
  });

  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* 1. 황동 촛대 받침대 (몰딩이 있는 둥근 단) */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.04, 16]} />
        <meshStandardMaterial
          color="#d97706"
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>
      {/* 촛대 중간 기둥 링 */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <torusGeometry args={[0.04, 0.012, 8, 16]} />
        <meshStandardMaterial
          color="#fbbf24"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>
      {/* 촛대 상단 드립 팬 (Drip Pan) */}
      <mesh position={[0, 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.03, 0.02, 16]} />
        <meshStandardMaterial
          color="#b45309"
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>

      {/* 2. 아이보리 양초 기둥 & 흘러내린 촛농 디테일 */}
      <mesh position={[0, 0.21, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.035, 0.26, 16]} />
        <meshStandardMaterial color="#fef3c7" roughness={0.65} />
      </mesh>
      {/* 양초 심지 (Wick) */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.03, 6]} />
        <meshBasicMaterial color="#1c1917" />
      </mesh>

      {/* 3. 눈물방울 형태의 따스한 촛불 (Teardrop Flame) */}
      {isLit && (
        <group position={[0, 0.375, 0]}>
          {/* 외부 오렌지 글로우 */}
          <mesh ref={flameRef}>
            <sphereGeometry args={[0.024, 12, 12]} />
            <meshStandardMaterial
              color="#fde047"
              emissive="#f97316"
              emissiveIntensity={3.6}
              toneMapped={false}
            />
          </mesh>
          {/* 내부 코어 화이트 라이트 */}
          <mesh position={[0, -0.004, 0]} scale={[0.5, 0.7, 0.5]}>
            <sphereGeometry args={[0.016, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      )}

      {/* 포인트 라이트 (부드러운 감쇠) */}
      {isLit && (
        <pointLight
          ref={lightRef}
          position={[0, 0.42, 0]}
          color="#f59e0b"
          intensity={2.2}
          distance={6.5}
          decay={2}
          castShadow
          shadow-bias={-0.001}
        />
      )}
    </group>
  );
}

// 다단 단조 철제 촛불 봉헌대 (Wrought Iron Votive Stand)
function DetailedVotiveStand({
  position,
  isLit = true,
}: {
  position: [number, number, number];
  isLit?: boolean;
}) {
  const ironMat = (
    <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.35} />
  );
  const brassTrimMat = (
    <meshStandardMaterial color="#d97706" metalness={0.7} roughness={0.3} />
  );

  return (
    <group position={position}>
      {/* 1. 단조 철제 삼각/사각 베이스 */}
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.08, 0.6]} />
        {ironMat}
      </mesh>
      {/* 베이스 황동 몰딩 테두리 */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[0.92, 0.02, 0.62]} />
        {brassTrimMat}
      </mesh>

      {/* 2. 네 모서리 스탠드 다리 & 나선 트위스트 기둥 */}
      {[-0.38, 0.38].map((x, xi) =>
        [-0.22, 0.22].map((z, zi) => (
          <group key={`leg-${xi}-${zi}`} position={[x, 0.45, z]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.022, 0.022, 0.8, 8]} />
              {ironMat}
            </mesh>
            {/* 중간 황동 링 */}
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.04, 8]} />
              {brassTrimMat}
            </mesh>
          </group>
        ))
      )}

      {/* 3. 1단 & 2단 계단형 선반 */}
      <mesh position={[0, 0.85, -0.1]} castShadow receiveShadow>
        <boxGeometry args={[0.84, 0.04, 0.26]} />
        {ironMat}
      </mesh>
      <mesh position={[0, 0.98, 0.12]} castShadow receiveShadow>
        <boxGeometry args={[0.84, 0.04, 0.26]} />
        {ironMat}
      </mesh>

      {/* 선반 위 봉헌용 유리잔 촛불들 (1단 4개, 2단 3개) */}
      {[-0.3, -0.1, 0.1, 0.3].map((cx, i) => (
        <group key={`candle-tier1-${i}`} position={[cx, 0.87, -0.1]}>
          <DetailedCandle position={[0, 0, 0]} isLit={isLit} scale={0.8} />
        </group>
      ))}
      {[-0.2, 0, 0.2].map((cx, i) => (
        <group key={`candle-tier2-${i}`} position={[cx, 1.0, 0.12]}>
          <DetailedCandle position={[0, 0, 0]} isLit={isLit} scale={0.85} />
        </group>
      ))}
    </group>
  );
}

// 고풍스러운 1인 전용 단독 기도대 (Gothic Wooden Prie-Dieu Kneeler)
function GothicPrivateKneeler({
  position,
  woodTex,
}: {
  position: [number, number, number];
  woodTex: THREE.CanvasTexture;
}) {
  const woodMat = useMemo(
    () => (
      <meshStandardMaterial
        map={woodTex}
        color="#854d0e"
        roughness={0.65}
        metalness={0.15}
      />
    ),
    [woodTex]
  );

  const velvetMat = (
    <meshStandardMaterial
      color="#881337"
      roughness={0.9}
      metalness={0.05}
    />
  );

  const goldTrimMat = (
    <meshStandardMaterial
      color="#fbbf24"
      metalness={0.8}
      roughness={0.25}
    />
  );

  return (
    <group position={position}>
      {/* 1. 하단 무릎 받침대 (목재 프레임 + 버건디 벨벳 쿠션) */}
      <mesh position={[0, 0.06, 0.12]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.12, 0.38]} />
        {woodMat}
      </mesh>
      <mesh position={[0, 0.14, 0.12]} castShadow receiveShadow>
        <boxGeometry args={[0.84, 0.05, 0.34]} />
        {velvetMat}
      </mesh>

      {/* 2. 전면 프레임 기둥 & 고딕 릴리프 장식 */}
      <mesh position={[-0.4, 0.5, -0.12]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.85, 0.08]} />
        {woodMat}
      </mesh>
      <mesh position={[0.4, 0.5, -0.12]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.85, 0.08]} />
        {woodMat}
      </mesh>

      {/* 중앙 고딕 십자가 투각 패널 */}
      <mesh position={[0, 0.48, -0.12]} castShadow receiveShadow>
        <boxGeometry args={[0.72, 0.75, 0.04]} />
        {woodMat}
      </mesh>
      {/* 금박 십자가 인레이 */}
      <group position={[0, 0.55, -0.098]}>
        <mesh castShadow>
          <boxGeometry args={[0.04, 0.32, 0.01]} />
          {goldTrimMat}
        </mesh>
        <mesh position={[0, 0.06, 0]} castShadow>
          <boxGeometry args={[0.2, 0.04, 0.01]} />
          {goldTrimMat}
        </mesh>
      </group>

      {/* 3. 상단 비스듬한 성경 받침대 / 팔걸이 */}
      <mesh
        position={[0, 0.94, -0.14]}
        rotation={[0.2, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.96, 0.05, 0.32]} />
        {woodMat}
      </mesh>

      {/* 성경책 소품 (펼쳐진 가죽 성경책) */}
      <group position={[0, 0.985, -0.14]} rotation={[0.2, 0, 0]}>
        {/* 가죽 커버 */}
        <mesh castShadow>
          <boxGeometry args={[0.34, 0.03, 0.24]} />
          <meshStandardMaterial color="#451a03" roughness={0.7} />
        </mesh>
        {/* 양피지 페이지 */}
        <mesh position={[0, 0.018, 0]} castShadow>
          <boxGeometry args={[0.31, 0.02, 0.22]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.8} />
        </mesh>
        {/* 붉은 리본 갈피끈 */}
        <mesh position={[0, 0.03, 0.04]}>
          <boxGeometry args={[0.012, 0.005, 0.16]} />
          <meshStandardMaterial color="#b91c1c" />
        </mesh>
      </group>
    </group>
  );
}

// 배럴 볼트 천장 (Barrel Vault Ceiling with Gothic Arched Ribs & Hanging Chandelier)
function GothicVaultCeiling({
  wallTex,
}: {
  wallTex: THREE.CanvasTexture;
}) {
  const stoneMat = useMemo(
    () => (
      <meshStandardMaterial
        map={wallTex}
        color="#64748b"
        roughness={0.85}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    ),
    [wallTex]
  );

  const ribMat = (
    <meshStandardMaterial color="#334155" roughness={0.8} metalness={0.15} />
  );

  const ironMat = (
    <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.3} />
  );

  return (
    <group position={[0, 4.5, 0]}>
      {/* 1. 배럴 볼트 곡면 천장 (반원통 아치, 폭 12m, 길이 16m) */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry
          args={[6, 6, 16, 32, 1, true, Math.PI * 0.15, Math.PI * 0.7]}
        />
        {stoneMat}
      </mesh>

      {/* 2. 석조 아치 리브 (Arch Ribs) 5개 */}
      {[-6, -3, 0, 3, 6].map((z, i) => (
        <group key={`arch-rib-${i}`} position={[0, 0, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry
              args={[5.9, 5.9, 0.38, 28, 1, true, Math.PI * 0.15, Math.PI * 0.7]}
            />
            {ribMat}
          </mesh>
          {/* 아치 중앙 키스톤 장식 */}
          <mesh position={[0, 2.92, 0]} castShadow>
            <boxGeometry args={[0.5, 0.35, 0.45]} />
            {ribMat}
          </mesh>
        </group>
      ))}

      {/* 3. 중앙 천장 펜던트 철제 링 샹들리에 (Gothic Ring Chandelier at Z=0) */}
      <group position={[0, 1.6, 0]}>
        {/* 매달린 쇠사슬 체인 */}
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 1.4, 6]} />
          {ironMat}
        </mesh>
        {/* 원형 철제 링 */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[1.2, 0.035, 8, 24]} />
          {ironMat}
        </mesh>
        {/* 링 위 촛불 6개 & 포인트 라이트 */}
        {[0, 1, 2, 3, 4, 5].map((idx) => {
          const angle = (idx / 6) * Math.PI * 2;
          const cx = Math.cos(angle) * 1.2;
          const cz = Math.sin(angle) * 1.2;
          return (
            <DetailedCandle
              key={`chand-c-${idx}`}
              position={[cx, 0.04, cz]}
              isLit={true}
              scale={0.7}
            />
          );
        })}
      </group>
    </group>
  );
}

export interface PrivateChapelSceneProps {
  isCandleLit?: boolean;
}

export default function PrivateChapelScene({
  isCandleLit = true,
}: PrivateChapelSceneProps) {
  // 절차적 PBR 텍스처 로드 (메모이제이션)
  const floorTex = useMemo(() => getStoneFloorTexture(8, 10), []);
  const wallTex = useMemo(() => getStoneWallTexture(6, 4), []);
  const woodTex = useMemo(() => getWoodTexture(2, 4), []);
  const carpetTex = useMemo(() => getCarpetTexture(1, 6), []);
  const marbleTex = useMemo(() => getMarbleTexture(), []);
  const stainedGlassLancetBlue = useMemo(() => getStainedGlassLancetTexture('blue'), []);
  const stainedGlassLancetAmber = useMemo(() => getStainedGlassLancetTexture('amber'), []);
  const stainedGlassLancetPurple = useMemo(() => getStainedGlassLancetTexture('purple'), []);

  // 머티리얼 정의
  const stoneFloorMat = useMemo(
    () => (
      <meshStandardMaterial
        map={floorTex}
        roughness={0.75}
        metalness={0.15}
      />
    ),
    [floorTex]
  );

  const stoneWallMat = useMemo(
    () => (
      <meshStandardMaterial
        map={wallTex}
        roughness={0.85}
        metalness={0.1}
      />
    ),
    [wallTex]
  );

  const carpetMat = useMemo(
    () => (
      <meshStandardMaterial
        map={carpetTex}
        roughness={0.92}
        metalness={0.05}
      />
    ),
    [carpetTex]
  );

  const marbleMat = useMemo(
    () => (
      <meshStandardMaterial
        map={marbleTex}
        roughness={0.35}
        metalness={0.2}
      />
    ),
    [marbleTex]
  );

  const darkWoodMat = useMemo(
    () => (
      <meshStandardMaterial
        map={woodTex}
        color="#261208"
        roughness={0.65}
        metalness={0.15}
      />
    ),
    [woodTex]
  );

  const goldMat = (
    <meshStandardMaterial
      color="#fbbf24"
      metalness={0.85}
      roughness={0.25}
    />
  );

  return (
    <group>
      {/* -------------------------------------------------------------
          1. 석조 바닥 (12m × 16m) & 중앙 버건디 벨벳 런너 카펫
          ------------------------------------------------------------- */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[12, 16]} />
        {stoneFloorMat}
      </mesh>

      {/* 중앙 버건디 벨벳 카펫 런너 (폭 2.2m, 길이 12.6m) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 1.2]}
        receiveShadow
      >
        <planeGeometry args={[2.2, 12.6]} />
        {carpetMat}
      </mesh>

      {/* 카펫 양 끝 금빛 태슬 장식 (Tassel Trims) */}
      {[-5.1, 7.5].map((z, idx) => (
        <mesh key={`tassel-${idx}`} position={[0, 0.008, z]}>
          <boxGeometry args={[2.2, 0.01, 0.06]} />
          {goldMat}
        </mesh>
      ))}

      {/* -------------------------------------------------------------
          2. 4면 석조 외벽 (12m × 16m × 7.5m)
          ------------------------------------------------------------- */}
      {/* 북측 전면 벽 (제단 뒤, Z = -8.0m) */}
      <mesh position={[0, 3.75, -8.0]} receiveShadow castShadow>
        <boxGeometry args={[12, 7.5, 0.4]} />
        {stoneWallMat}
      </mesh>

      {/* 제단 뒤 고딕 블라인드 아케이드 (Blind Arcade 릴리프 장식) */}
      {[-3, -1.5, 1.5, 3].map((x, i) => (
        <group key={`blind-arcade-${i}`} position={[x, 3.0, -7.78]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.0, 4.2, 0.06]} />
            {stoneWallMat}
          </mesh>
          {/* 아치 상단 뾰족 헤더 */}
          <mesh position={[0, 2.3, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
            <boxGeometry args={[0.7, 0.7, 0.08]} />
            {stoneWallMat}
          </mesh>
        </group>
      ))}

      {/* 남측 후면 벽 (입구 쪽, Z = +8.0m) */}
      <mesh position={[-3.6, 3.75, 8.0]} receiveShadow castShadow>
        <boxGeometry args={[4.8, 7.5, 0.4]} />
        {stoneWallMat}
      </mesh>
      <mesh position={[3.6, 3.75, 8.0]} receiveShadow castShadow>
        <boxGeometry args={[4.8, 7.5, 0.4]} />
        {stoneWallMat}
      </mesh>
      <mesh position={[0, 5.75, 8.0]} receiveShadow castShadow>
        <boxGeometry args={[2.4, 3.5, 0.4]} />
        {stoneWallMat}
      </mesh>

      {/* 앤틱 오크 출입문 & 철제 스트랩 경첩 */}
      <group position={[0, 0, 7.82]}>
        {/* 문틀 좌우/상단 고딕 몰딩 */}
        <mesh position={[-1.2, 2.0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.18, 4.0, 0.22]} />
          {darkWoodMat}
        </mesh>
        <mesh position={[1.2, 2.0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.18, 4.0, 0.22]} />
          {darkWoodMat}
        </mesh>
        <mesh position={[0, 4.0, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.58, 0.2, 0.24]} />
          {darkWoodMat}
        </mesh>
        {/* 육중한 오크 더블 도어 */}
        <mesh position={[0, 1.9, 0.05]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 3.8, 0.08]} />
          {darkWoodMat}
        </mesh>
        {/* 앤틱 단조 철제 스트랩 경첩 3쌍 */}
        {[0.8, 2.0, 3.2].map((hy, idx) => (
          <group key={`hinge-${idx}`} position={[0, hy, 0.095]}>
            <mesh position={[-0.55, 0, 0]}>
              <boxGeometry args={[0.9, 0.04, 0.015]} />
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.3} />
            </mesh>
            <mesh position={[0.55, 0, 0]}>
              <boxGeometry args={[0.9, 0.04, 0.015]} />
              <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.3} />
            </mesh>
          </group>
        ))}
        {/* 황동 사자머리 도어 핸들 */}
        <mesh position={[-0.15, 1.9, 0.11]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          {goldMat}
        </mesh>
        <mesh position={[0.15, 1.9, 0.11]}>
          <sphereGeometry args={[0.045, 12, 12]} />
          {goldMat}
        </mesh>
      </group>

      {/* 서측 좌측 외벽 (X = -6.0m) */}
      <mesh position={[-6.0, 3.75, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.4, 7.5, 16]} />
        {stoneWallMat}
      </mesh>

      {/* 동측 우측 외벽 (X = +6.0m) */}
      <mesh position={[6.0, 3.75, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.4, 7.5, 16]} />
        {stoneWallMat}
      </mesh>

      {/* 벽면 하단 베이스 몰딩 플린스 (Wall Plinth Trim) */}
      <mesh position={[-5.82, 0.25, 0]} receiveShadow>
        <boxGeometry args={[0.15, 0.5, 16]} />
        {stoneWallMat}
      </mesh>
      <mesh position={[5.82, 0.25, 0]} receiveShadow>
        <boxGeometry args={[0.15, 0.5, 16]} />
        {stoneWallMat}
      </mesh>

      {/* -------------------------------------------------------------
          3. 배럴 볼트 천장 & 아치 리브
          ------------------------------------------------------------- */}
      <GothicVaultCeiling wallTex={wallTex} />

      {/* 측면 고딕 필라스터(벽 기둥 6개) */}
      {[-5.6, 5.6].map((x, xi) =>
        [-4, 0, 4].map((z, zi) => (
          <group key={`pilaster-${xi}-${zi}`} position={[x, 0, z]}>
            {/* 기둥 베이스 */}
            <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.9, 0.7, 0.9]} />
              {stoneWallMat}
            </mesh>
            {/* 원형 기둥 샤프트 */}
            <mesh position={[0, 3.8, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.38, 0.42, 6.2, 20]} />
              {stoneWallMat}
            </mesh>
            {/* 주두(Capital) 고딕 몰딩 */}
            <mesh position={[0, 6.9, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.85, 0.4, 0.85]} />
              {stoneWallMat}
            </mesh>
          </group>
        ))
      )}

      {/* -------------------------------------------------------------
          4. 제단 (카라라 대리석 & 촛불 4개) & 십자가 (금박 테두리 다크 오크)
          ------------------------------------------------------------- */}
      {/* 제단 1단 단상 (석재 계단 몰딩) */}
      <mesh position={[0, 0.12, -6.3]} receiveShadow castShadow>
        <boxGeometry args={[4.8, 0.24, 2.8]} />
        {stoneWallMat}
      </mesh>

      {/* 제단 테이블 본체 (화이트 카라라 대리석) */}
      <group position={[0, 0.72, -6.3]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.8, 0.96, 0.96]} />
          {marbleMat}
        </mesh>
        {/* 제단 전면 금빛 십자가 & 트레포일 음각 몰딩 패널 */}
        <mesh position={[0, 0, 0.485]} castShadow>
          <boxGeometry args={[2.5, 0.75, 0.02]} />
          {stoneWallMat}
        </mesh>
        <mesh position={[0, 0, 0.498]} castShadow>
          <boxGeometry args={[0.06, 0.48, 0.01]} />
          {goldMat}
        </mesh>
        <mesh position={[0, 0.1, 0.498]} castShadow>
          <boxGeometry args={[0.32, 0.06, 0.01]} />
          {goldMat}
        </mesh>
      </group>

      {/* 제단보 (순백 리넨 + 골드 레이스 트림) */}
      <mesh position={[0, 1.21, -6.3]} receiveShadow>
        <boxGeometry args={[2.92, 0.04, 1.02]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.7} />
      </mesh>
      {/* 좌우로 늘어진 제단보 드레이프 */}
      {[-1.46, 1.46].map((dx, i) => (
        <mesh key={`cloth-drop-${i}`} position={[dx, 1.05, -6.3]} receiveShadow>
          <boxGeometry args={[0.02, 0.32, 1.02]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.7} />
        </mesh>
      ))}

      {/* 황동 성작(Chalice) 소품 */}
      <group position={[0, 1.26, -6.1]}>
        <mesh position={[0, 0.02, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.06, 0.04, 16]} />
          {goldMat}
        </mesh>
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.08, 12]} />
          {goldMat}
        </mesh>
        <mesh position={[0, 0.15, 0]} castShadow>
          <sphereGeometry args={[0.06, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          {goldMat}
        </mesh>
      </group>

      {/* 제단 위 4개의 황동 촛대 & 촛불 */}
      <DetailedCandle position={[-1.0, 1.23, -6.3]} isLit={isCandleLit} />
      <DetailedCandle position={[-0.35, 1.23, -6.3]} isLit={isCandleLit} />
      <DetailedCandle position={[0.35, 1.23, -6.3]} isLit={isCandleLit} />
      <DetailedCandle position={[1.0, 1.23, -6.3]} isLit={isCandleLit} />

      {/* 정교한 고딕 십자가 (북측 벽면, 다크 오크 본체 + 금박 베벨 + 후광 링) */}
      <group position={[0, 4.2, -7.74]}>
        {/* 십자가 다크 우드 본체 */}
        <mesh castShadow>
          <boxGeometry args={[0.22, 3.2, 0.1]} />
          {darkWoodMat}
        </mesh>
        <mesh position={[0, 0.65, 0.01]} castShadow>
          <boxGeometry args={[1.9, 0.22, 0.1]} />
          {darkWoodMat}
        </mesh>
        {/* 십자가 금빛 베벨 테두리 (Gold Beveled Outline) */}
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[0.26, 3.24, 0.08]} />
          {goldMat}
        </mesh>
        <mesh position={[0, 0.65, 0]}>
          <boxGeometry args={[1.94, 0.26, 0.08]} />
          {goldMat}
        </mesh>
        {/* 십자가 교차점 후광 링 (Aureole Ring) */}
        <mesh position={[0, 0.65, -0.02]}>
          <ringGeometry args={[0.55, 0.68, 28]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#d97706"
            emissiveIntensity={1.4}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* 십자가 집중 은은한 조명 */}
        <pointLight
          position={[0, 0.7, 0.8]}
          intensity={isCandleLit ? 2.0 : 0.9}
          color="#fef08a"
          distance={5.5}
        />
      </group>

      {/* -------------------------------------------------------------
          5. 단독 1인 전용 기도대 (Prie-Dieu)
          ------------------------------------------------------------- */}
      <GothicPrivateKneeler position={[0, 0, -3.7]} woodTex={woodTex} />

      {/* -------------------------------------------------------------
          6. 좌우 다단 단조 철제 촛불 봉헌대 2개
          ------------------------------------------------------------- */}
      <DetailedVotiveStand position={[-3.2, 0, -4.5]} isLit={isCandleLit} />
      <DetailedVotiveStand position={[3.2, 0, -4.5]} isLit={isCandleLit} />

      {/* -------------------------------------------------------------
          7. 고딕 스테인드글라스 창문 (전면 북측 & 좌우 측벽)
          ------------------------------------------------------------- */}
      {/* 북측 십자가 상단 고딕 아치 란셋 스테인드글라스 */}
      <group position={[0, 6.2, -7.78]}>
        {/* 석조 창틀 몰딩 */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.2, 2.0, 0.12]} />
          {stoneWallMat}
        </mesh>
        {/* 발광 스테인드글라스 패널 */}
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[1.9, 1.7]} />
          <meshStandardMaterial
            map={stainedGlassLancetBlue}
            emissive="#0284c7"
            emissiveIntensity={1.8}
            roughness={0.2}
          />
        </mesh>
        {/* 창문 통과 푸른 달빛 */}
        <pointLight
          position={[0, 0, 0.5]}
          intensity={1.2}
          color="#38bdf8"
          distance={6.0}
        />
      </group>

      {/* 서측 벽면 란셋 창문 2개 */}
      {[-2, 2].map((z, i) => (
        <group key={`stained-w-${i}`} position={[-5.78, 4.2, z]}>
          {/* 창틀 석조 프레임 */}
          <mesh rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.5, 2.7, 0.12]} />
            {stoneWallMat}
          </mesh>
          <mesh position={[0.06, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[1.2, 2.4]} />
            <meshStandardMaterial
              map={stainedGlassLancetPurple}
              emissive="#7e22ce"
              emissiveIntensity={1.1}
              roughness={0.25}
            />
          </mesh>
        </group>
      ))}

      {/* 동측 벽면 란셋 창문 2개 */}
      {[-2, 2].map((z, i) => (
        <group key={`stained-e-${i}`} position={[5.78, 4.2, z]}>
          <mesh rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.5, 2.7, 0.12]} />
            {stoneWallMat}
          </mesh>
          <mesh position={[-0.06, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[1.2, 2.4]} />
            <meshStandardMaterial
              map={stainedGlassLancetAmber}
              emissive="#d97706"
              emissiveIntensity={1.2}
              roughness={0.25}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
