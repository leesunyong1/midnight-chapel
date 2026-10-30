'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Collider, RoomBounds } from './collisionUtils';
import { COMMUNITY_SPAWN_POINTS } from './spawnSystem';
import {
  getStoneFloorTexture,
  getStoneWallTexture,
  getWoodTexture,
  getCarpetTexture,
  getStainedGlassRoseTexture,
  getStainedGlassLancetTexture,
  getMarbleTexture,
} from './proceduralTextures';
import GrandGothicCrucifix from './GrandGothicCrucifix';

// -------------------------------------------------------------
// 공동 기도실 물리적 스펙 (30m × 45m × 20m) — 기존 충돌체 100% 유지
// -------------------------------------------------------------
export const COMMUNITY_CATHEDRAL_BOUNDS: RoomBounds = {
  minX: -14.5,
  maxX: 14.5,
  minZ: -22.0,
  maxZ: 22.0,
};

// 장의자 Z 위치 8열
const PEW_Z_ROWS = [-13.5, -10.0, -6.5, -3.0, 0.5, 4.0, 7.5, 11.0];

// 기둥 Z 위치 6쌍 (총 12개)
const COLUMN_Z_POSITIONS = [-15.0, -9.0, -3.0, 3.0, 9.0, 15.0];

// 충돌체 목록 (기존 스펙 100% 동일 유지)
export const COMMUNITY_CATHEDRAL_COLLIDERS: Collider[] = [
  // 1. 대형 제단 단상 및 테이블 (X: -5.5 ~ +5.5, Z: -22.0 ~ -16.5)
  {
    type: 'box',
    minX: -5.5,
    maxX: 5.5,
    minZ: -22.0,
    maxZ: -16.5,
    name: 'Grand Sanctuary Altar Platform',
  },

  // 2. 좌우 장의자 16개 (좌 8개, 우 8개) & 0.4m 틈새 통행 차단
  ...PEW_Z_ROWS.flatMap((z, idx) => [
    {
      type: 'box' as const,
      minX: -7.2,
      maxX: -2.8,
      minZ: z - 0.55,
      maxZ: z + 0.55,
      name: `Left Pew Row ${idx + 1} & Gap Barrier`,
    },
    {
      type: 'box' as const,
      minX: 2.8,
      maxX: 7.2,
      minZ: z - 0.55,
      maxZ: z + 0.55,
      name: `Right Pew Row ${idx + 1} & Gap Barrier`,
    },
  ]),

  // 3. 석조 원기둥 12개 (좌 6개, 우 6개, 중심 X = ±7.2m, 반경 0.6m)
  ...COLUMN_Z_POSITIONS.flatMap((z, idx) => [
    {
      type: 'cylinder' as const,
      x: -7.2,
      z,
      radius: 0.6,
      name: `Left Column ${idx + 1}`,
    },
    {
      type: 'cylinder' as const,
      x: 7.2,
      z,
      radius: 0.6,
      name: `Right Column ${idx + 1}`,
    },
  ]),

  // 4. 대형 촛불 봉헌대 2개
  {
    type: 'box',
    minX: -10.2,
    maxX: -8.8,
    minZ: 13.4,
    maxZ: 14.6,
    name: 'West Grand Candle Stand',
  },
  {
    type: 'box',
    minX: 8.8,
    maxX: 10.2,
    minZ: 13.4,
    maxZ: 14.6,
    name: 'East Grand Candle Stand',
  },
];

// 고딕 클러스터드 피어 (Gothic Clustered Pier - 웅장한 다발 기둥)
function GothicClusteredColumn({
  position,
  wallTex,
}: {
  position: [number, number, number];
  wallTex: THREE.CanvasTexture;
}) {
  const stoneMat = (
    <meshStandardMaterial
      map={wallTex}
      roughness={0.85}
      metalness={0.15}
    />
  );

  return (
    <group position={position}>
      {/* 1. 다각형 석조 기단 (Base Plinth) */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.8, 1.5]} />
        {stoneMat}
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.72, 0.78, 0.2, 16]} />
        {stoneMat}
      </mesh>

      {/* 2. 중앙 메인 기둥 샤프트 (직경 1.1m, 높이 18m) */}
      <mesh position={[0, 9.8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.54, 0.56, 17.8, 20]} />
        {stoneMat}
      </mesh>

      {/* 3. 4방향 둘러싼 얇은 다발 기둥들 (Attached Colonnettes) */}
      {[
        [-0.45, 0],
        [0.45, 0],
        [0, -0.45],
        [0, 0.45],
      ].map(([ox, oz], i) => (
        <mesh
          key={`colonnette-${i}`}
          position={[ox, 9.8, oz]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.12, 0.12, 17.8, 12]} />
          {stoneMat}
        </mesh>
      ))}

      {/* 4. 상단 주두 (Capital Molding) */}
      <mesh position={[0, 18.8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.82, 0.6, 0.6, 16]} />
        {stoneMat}
      </mesh>
      <mesh position={[0, 19.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.65, 0.4, 1.65]} />
        {stoneMat}
      </mesh>
    </group>
  );
}

// 앤틱 교회 장의자 (폭 3.4m, 고딕 조각 측면 엔드패널, 찬송가 선반)
function GothicGrandPew({
  position,
  rotation = [0, 0, 0],
  woodTex,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  woodTex: THREE.CanvasTexture;
}) {
  const pewWoodMat = (
    <meshStandardMaterial
      map={woodTex}
      color="#713f12"
      roughness={0.65}
      metalness={0.12}
    />
  );

  return (
    <group position={position} rotation={rotation}>
      {/* 1. 좌판 (폭 3.4m, 깊이 0.48m) */}
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.08, 0.48]} />
        {pewWoodMat}
      </mesh>

      {/* 2. 등받이 */}
      <mesh
        position={[0, 0.8, -0.22]}
        rotation={[-0.08, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[3.4, 0.68, 0.06]} />
        {pewWoodMat}
      </mesh>

      {/* 3. 무릎 받침대 */}
      <mesh position={[0, 0.12, 0.18]} castShadow receiveShadow>
        <boxGeometry args={[3.3, 0.08, 0.22]} />
        {pewWoodMat}
      </mesh>

      {/* 4. 등받이 뒷면 성경/찬송가 꽂이 선반 */}
      <mesh position={[0, 0.68, -0.27]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 0.16, 0.08]} />
        {pewWoodMat}
      </mesh>
      {[-1.0, 0, 1.0].map((bx, i) => (
        <mesh key={`hymn-book-${i}`} position={[bx, 0.72, -0.27]} castShadow>
          <boxGeometry args={[0.22, 0.15, 0.05]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#831843' : '#1e3a8a'} roughness={0.7} />
        </mesh>
      ))}

      {/* 5. 고딕 조각 측면 엔드패널 */}
      {[-1.68, 1.68].map((x, i) => (
        <group key={`pew-end-${i}`} position={[x, 0.48, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.07, 0.95, 0.58]} />
            {pewWoodMat}
          </mesh>
          <mesh position={[0, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.07, 12]} />
            {pewWoodMat}
          </mesh>
        </group>
      ))}
      {/* 중앙 지지 다리 */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.07, 0.76, 0.5]} />
        {pewWoodMat}
      </mesh>
    </group>
  );
}

// 4분 리브 볼트 고딕 천장 리브
function GothicVaultArches({
  z,
  wallTex,
}: {
  z: number;
  wallTex: THREE.CanvasTexture;
}) {
  const stoneMat = (
    <meshStandardMaterial
      map={wallTex}
      roughness={0.85}
      metalness={0.15}
    />
  );

  return (
    <group position={[0, 19.0, z]}>
      {/* 횡단 뾰족 아치 */}
      <mesh
        position={[-3.6, 0.8, 0]}
        rotation={[0, 0, -Math.PI / 8]}
        castShadow
      >
        <boxGeometry args={[0.48, 7.8, 0.48]} />
        {stoneMat}
      </mesh>
      <mesh
        position={[3.6, 0.8, 0]}
        rotation={[0, 0, Math.PI / 8]}
        castShadow
      >
        <boxGeometry args={[0.48, 7.8, 0.48]} />
        {stoneMat}
      </mesh>

      {/* 중앙 키스톤 */}
      <group position={[0, 2.3, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.75, 0.75, 0.65]} />
          {stoneMat}
        </mesh>
        <mesh position={[0, -0.4, 0]} castShadow>
          <sphereGeometry args={[0.22, 12, 12]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

export interface CommunityCathedralSceneProps {
  showSpawnMarkers?: boolean;
  selectedSpawnId?: number;
}

export default function CommunityCathedralScene({
  showSpawnMarkers = true,
  selectedSpawnId,
}: CommunityCathedralSceneProps) {
  // 절차적 PBR 텍스처 로드 (메모이제이션)
  const floorTex = useMemo(() => getStoneFloorTexture(18, 26), []);
  const wallTex = useMemo(() => getStoneWallTexture(14, 8), []);
  const woodTex = useMemo(() => getWoodTexture(3, 5), []);
  const carpetTex = useMemo(() => getCarpetTexture(1, 14), []);
  const roseTex = useMemo(() => getStainedGlassRoseTexture(), []);
  const lancetBlueTex = useMemo(() => getStainedGlassLancetTexture('blue'), []);
  const lancetAmberTex = useMemo(() => getStainedGlassLancetTexture('amber'), []);
  const marbleTex = useMemo(() => getMarbleTexture(), []);

  // 머티리얼 정의
  const stoneFloorMat = (
    <meshStandardMaterial
      map={floorTex}
      roughness={0.75}
      metalness={0.2}
    />
  );

  const stoneWallMat = (
    <meshStandardMaterial
      map={wallTex}
      roughness={0.85}
      metalness={0.15}
    />
  );

  const carpetMat = (
    <meshStandardMaterial
      map={carpetTex}
      roughness={0.92}
      metalness={0.05}
    />
  );

  const marbleMat = (
    <meshStandardMaterial
      map={marbleTex}
      roughness={0.35}
      metalness={0.2}
    />
  );

  const goldMat = (
    <meshStandardMaterial
      color="#fbbf24"
      metalness={0.85}
      roughness={0.25}
    />
  );

  const darkWoodMat = (
    <meshStandardMaterial
      map={woodTex}
      color="#261208"
      roughness={0.65}
      metalness={0.15}
    />
  );

  return (
    <group>
      {/* -------------------------------------------------------------
          1. 대형 석조 바닥 (30m × 45m) & 중앙 5.6m 버건디 카펫 통로
          ------------------------------------------------------------- */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[30, 45]} />
        {stoneFloorMat}
      </mesh>

      {/* 중앙 통로: 정확히 폭 5.6m 버건디 골드 자수 카펫 런너 (X: -2.8m ~ +2.8m) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.006, -1.0]}
        receiveShadow
      >
        <planeGeometry args={[5.6, 31.0]} />
        {carpetMat}
      </mesh>

      {/* -------------------------------------------------------------
          2. 4면 20m 고딕 외벽 & 트리포리움 회랑 아케이드 몰딩
          ------------------------------------------------------------- */}
      {/* 북측 전면 벽 (Z = -22.5m) */}
      <mesh position={[0, 10.0, -22.5]} receiveShadow castShadow>
        <boxGeometry args={[30, 20, 0.6]} />
        {stoneWallMat}
      </mesh>

      {/* 남측 후면 입구 벽 (Z = +22.5m) & 고딕 3중 포탈 정문 */}
      <mesh position={[-8.5, 10.0, 22.5]} receiveShadow castShadow>
        <boxGeometry args={[13, 20, 0.6]} />
        {stoneWallMat}
      </mesh>
      <mesh position={[8.5, 10.0, 22.5]} receiveShadow castShadow>
        <boxGeometry args={[13, 20, 0.6]} />
        {stoneWallMat}
      </mesh>
      <mesh position={[0, 14.0, 22.5]} receiveShadow castShadow>
        <boxGeometry args={[4.0, 12, 0.6]} />
        {stoneWallMat}
      </mesh>

      {/* 고딕 대성당 주출입구 3중 몰딩 포탈 (Gothic Portal) */}
      <group position={[0, 0, 22.35]}>
        <mesh position={[-2.1, 4.0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.22, 0.25, 8.0, 16]} />
          {stoneWallMat}
        </mesh>
        <mesh position={[2.1, 4.0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.22, 0.25, 8.0, 16]} />
          {stoneWallMat}
        </mesh>
        <mesh position={[0, 7.0, 0]} castShadow receiveShadow>
          <boxGeometry args={[4.2, 0.4, 0.35]} />
          {stoneWallMat}
        </mesh>
        <mesh position={[0, 3.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.8, 6.4, 0.16]} />
          {darkWoodMat}
        </mesh>
        {[1.2, 3.2, 5.2].map((hy, idx) => (
          <mesh key={`portal-hinge-${idx}`} position={[0, hy, 0.09]}>
            <boxGeometry args={[3.6, 0.08, 0.02]} />
            <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* 서측 좌측 외벽 (X = -15.0m) */}
      <mesh position={[-15.0, 10.0, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.6, 20, 45]} />
        {stoneWallMat}
      </mesh>

      {/* 동측 우측 외벽 (X = +15.0m) */}
      <mesh position={[15.0, 10.0, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.6, 20, 45]} />
        {stoneWallMat}
      </mesh>

      {/* 벽면 수직 고딕 버트레스 (Wall Buttresses 6쌍) */}
      {COLUMN_Z_POSITIONS.map((z, idx) => (
        <group key={`buttress-${idx}`}>
          <mesh position={[-14.55, 10.0, z]} castShadow receiveShadow>
            <boxGeometry args={[0.45, 20, 0.9]} />
            {stoneWallMat}
          </mesh>
          <mesh position={[14.55, 10.0, z]} castShadow receiveShadow>
            <boxGeometry args={[0.45, 20, 0.9]} />
            {stoneWallMat}
          </mesh>
        </group>
      ))}

      {/* -------------------------------------------------------------
          3. 20m 고딕 리브 볼트 천장
          ------------------------------------------------------------- */}
      <mesh position={[0, 20.0, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 45]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>

      {/* 각 기둥 쌍을 가로지르는 고딕 뾰족 아치 볼트 리브들 */}
      {COLUMN_Z_POSITIONS.map((z, idx) => (
        <GothicVaultArches key={`gothic-arch-${idx}`} z={z} wallTex={wallTex} />
      ))}

      {/* -------------------------------------------------------------
          4. 고딕 클러스터드 다발 원기둥 12개 (좌 6개, 우 6개)
          - 중심: X = -7.2m / +7.2m
          ------------------------------------------------------------- */}
      {COLUMN_Z_POSITIONS.map((z, idx) => (
        <group key={`col-pair-${idx}`}>
          <GothicClusteredColumn position={[-7.2, 0, z]} wallTex={wallTex} />
          <GothicClusteredColumn position={[7.2, 0, z]} wallTex={wallTex} />
        </group>
      ))}

      {/* -------------------------------------------------------------
          5. 좌우 장의자 16개 & 기둥 틈새 0.4m 차단 패널
          - 중심: X = -4.5m / +4.5m, 폭: 3.4m
          ------------------------------------------------------------- */}
      {PEW_Z_ROWS.map((z, idx) => (
        <group key={`pew-row-${idx}`}>
          {/* 좌측 장의자 - 제단 십자가 방향(음수 Z)을 향하도록 180도 회전 */}
          <GothicGrandPew
            position={[-4.5, 0, z]}
            rotation={[0, Math.PI, 0]}
            woodTex={woodTex}
          />
          {/* 우측 장의자 - 제단 십자가 방향(음수 Z)을 향하도록 180도 회전 */}
          <GothicGrandPew
            position={[4.5, 0, z]}
            rotation={[0, Math.PI, 0]}
            woodTex={woodTex}
          />

          {/* 기둥과 장의자 사이 0.4m 틈새 통행 방지 고딕 목재 장벽 패널 */}
          <mesh position={[-6.7, 0.48, z]} castShadow receiveShadow>
            <boxGeometry args={[1.0, 0.96, 0.14]} />
            {darkWoodMat}
          </mesh>
          <mesh position={[6.7, 0.48, z]} castShadow receiveShadow>
            <boxGeometry args={[1.0, 0.96, 0.14]} />
            {darkWoodMat}
          </mesh>
        </group>
      ))}

      {/* -------------------------------------------------------------
          6. 대형 대리석 제단 & 고딕 레타블(Reredos) & 대형 십자가
          ------------------------------------------------------------- */}
      {/* 2단 성단 단상 */}
      <mesh position={[0, 0.18, -19.2]} receiveShadow castShadow>
        <boxGeometry args={[10.0, 0.36, 5.2]} />
        {stoneWallMat}
      </mesh>
      <mesh position={[0, 0.42, -19.4]} receiveShadow castShadow>
        <boxGeometry args={[8.0, 0.24, 4.4]} />
        {stoneWallMat}
      </mesh>

      {/* 대성당 대형 제단 테이블 (카라라 대리석) */}
      <group position={[0, 1.15, -19.4]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[5.2, 1.2, 1.5]} />
          {marbleMat}
        </mesh>
        <mesh position={[0, 0, 0.76]} castShadow>
          <boxGeometry args={[0.08, 0.6, 0.02]} />
          {goldMat}
        </mesh>
        <mesh position={[0, 0.12, 0.76]} castShadow>
          <boxGeometry args={[0.42, 0.08, 0.02]} />
          {goldMat}
        </mesh>
      </group>

      {/* 제단보 */}
      <mesh position={[0, 1.77, -19.4]} receiveShadow>
        <boxGeometry args={[5.4, 0.04, 1.6]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.7} />
      </mesh>

      {/* 제단 뒤 고딕 석조 레타블 (Reredos / Altarpiece) */}
      <group position={[0, 2.5, -20.6]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[6.4, 3.2, 0.4]} />
          {stoneWallMat}
        </mesh>
        {[-2.0, 0, 2.0].map((rx, ri) => (
          <group key={`reredos-spire-${ri}`} position={[rx, 2.2, 0]}>
            <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
              <coneGeometry args={[0.45, 1.4, 4]} />
              {stoneWallMat}
            </mesh>
            <mesh position={[0, 0.85, 0]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              {goldMat}
            </mesh>
          </group>
        ))}
      </group>

      {/* 제단 위 대형 황동 촛대 8개 */}
      {[-2.0, -1.4, -0.8, -0.2, 0.2, 0.8, 1.4, 2.0].map((cx, i) => (
        <group key={`altar-candle-${i}`} position={[cx, 1.79, -19.4]}>
          <mesh position={[0, 0.18, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, 0.36, 16]} />
            {goldMat}
          </mesh>
          <mesh position={[0, 0.42, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.04, 0.22, 16]} />
            <meshStandardMaterial color="#fef3c7" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.56, 0]}>
            <sphereGeometry args={[0.032, 12, 12]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive="#f59e0b"
              emissiveIntensity={3.8}
              toneMapped={false}
            />
          </mesh>
          <pointLight
            position={[0, 0.62, 0]}
            color="#f97316"
            intensity={1.4}
            distance={5.5}
          />
        </group>
      ))}

      {/* 고난 십자가상 (Sacred Gothic Crucifix of Jesus Christ - 8.2m 대형 다크오크 & 예수 그리스도 성상) */}
      <GrandGothicCrucifix position={[0, 8.5, -22.1]} />

      {/* -------------------------------------------------------------
          7. 스테인드글라스 (북측 직경 7m 장미창 & 측벽 12개 란셋 창문)
          ------------------------------------------------------------- */}
      <group position={[0, 14.5, -22.1]}>
        <mesh>
          <ringGeometry args={[3.45, 3.8, 36]} />
          {stoneWallMat}
        </mesh>
        <mesh>
          <circleGeometry args={[3.5, 36]} />
          <meshStandardMaterial
            map={roseTex}
            emissive="#38bdf8"
            emissiveIntensity={1.8}
            roughness={0.2}
          />
        </mesh>
        <pointLight
          position={[0, 0, 2.5]}
          intensity={3.2}
          color="#38bdf8"
          distance={18}
        />
      </group>

      {COLUMN_Z_POSITIONS.map((z, idx) => (
        <group key={`stained-sides-${idx}`}>
          <group position={[-14.65, 11.0, z]}>
            <mesh rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[2.7, 7.5, 0.2]} />
              {stoneWallMat}
            </mesh>
            <mesh position={[0.11, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[2.4, 7.0]} />
              <meshStandardMaterial
                map={lancetBlueTex}
                emissive="#0284c7"
                emissiveIntensity={1.2}
                roughness={0.25}
              />
            </mesh>
          </group>

          <group position={[14.65, 11.0, z]}>
            <mesh rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[2.7, 7.5, 0.2]} />
              {stoneWallMat}
            </mesh>
            <mesh position={[-0.11, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[2.4, 7.0]} />
              <meshStandardMaterial
                map={lancetAmberTex}
                emissive="#d97706"
                emissiveIntensity={1.2}
                roughness={0.25}
              />
            </mesh>
          </group>
        </group>
      ))}

      {/* -------------------------------------------------------------
          8. 촛불 봉헌대 2개 (입구 광장 좌우)
          ------------------------------------------------------------- */}
      {[-9.5, 9.5].map((x, i) => (
        <group key={`cathedral-votive-${i}`} position={[x, 0, 14.0]}>
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.4, 1.0, 0.8]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.02, 0]} castShadow>
            <boxGeometry args={[1.44, 0.04, 0.84]} />
            {goldMat}
          </mesh>
          {[-0.45, 0, 0.45].flatMap((cx) =>
            [-0.2, 0.2].map((cz, ci) => (
              <group key={`v-c-${cx}-${cz}-${ci}`} position={[cx, 1.05, cz]}>
                <mesh position={[0, 0.1, 0]}>
                  <cylinderGeometry args={[0.03, 0.03, 0.2, 12]} />
                  <meshStandardMaterial color="#fef3c7" />
                </mesh>
                <mesh position={[0, 0.23, 0]}>
                  <sphereGeometry args={[0.024, 10, 10]} />
                  <meshStandardMaterial
                    color="#fde047"
                    emissive="#f59e0b"
                    emissiveIntensity={3.2}
                  />
                </mesh>
              </group>
            ))
          )}
          <pointLight
            position={[0, 1.6, 0]}
            intensity={2.2}
            color="#f97316"
            distance={8.0}
          />
        </group>
      ))}

      {/* -------------------------------------------------------------
          9. 입구 광장 60개 스폰 지점 마커 (Narthex / Spawn Visualization)
          - 15열 × 4행 (총 60개)
          ------------------------------------------------------------- */}
      {showSpawnMarkers && (
        <group position={[0, 0.015, 0]}>
          {COMMUNITY_SPAWN_POINTS.map((pt) => {
            const isSelected = selectedSpawnId === pt.id;
            return (
              <group key={`spawn-pt-${pt.id}`} position={[pt.x, 0, pt.z]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.24, 0.32, 24]} />
                  <meshBasicMaterial
                    color={isSelected ? '#38bdf8' : '#64748b'}
                    transparent
                    opacity={isSelected ? 0.95 : 0.35}
                    depthWrite={false}
                  />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[0.09, 16]} />
                  <meshBasicMaterial
                    color={isSelected ? '#0284c7' : '#94a3b8'}
                    transparent
                    opacity={isSelected ? 0.95 : 0.45}
                    depthWrite={false}
                  />
                </mesh>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}
