'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface GrandGothicCrucifixProps {
  position?: [number, number, number];
}

/**
 * 대성당 고난 십자가상 (Sacred Gothic Crucifix of Jesus Christ)
 * - 8.2m 대형 다크 오크 목재 십자가 & 트레포일 삼엽 고딕 장식
 * - INRI 성패 (Titulus Crucis) 및 발 받침대 (Suppedaneum)
 * - 천상의 영광을 상징하는 황금빛 켈틱 후광 오라 (Aureole Halo)
 * - 정교한 예수 그리스도 3D 입체 성상 (Corpus Christi):
 *   - 가시면류관(Crown of Thorns)을 쓰고 오른쪽 어깨로 고요히 고개 숙이신 성스러운 머리
 *   - 십자가 보를 따라 시원하게 뻗은 양팔과 손바닥을 관통한 대형 성정 (Passion Nails)
 *   - 해부학적 흉곽과 우측 성스러운 창상 (Sacred Lance Wound)
 *   - 순백 린넨의 주름진 성스러운 허리 천 (Perizoma)과 매듭
 *   - 포개어진 두 발과 하나의 대형 철못
 * - 성상을 밝히는 성스러운 집중 조명
 */
export default function GrandGothicCrucifix({
  position = [0, 8.5, -22.1],
}: GrandGothicCrucifixProps) {
  const targetRef = useRef<THREE.Group>(null);

  // 고품질 PBR 머티리얼 구성
  const materials = useMemo(() => {
    // 1. 고딕 십자가 다크 오크 목재 (묵직하고 깊은 질감)
    const woodMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2d1a10'),
      roughness: 0.72,
      metalness: 0.08,
    });

    // 2. 성스러운 전례 황금 트림 (Liturgical Gold Rim)
    const goldMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#d97706'),
      roughness: 0.28,
      metalness: 0.88,
    });

    // 3. 예수 그리스도 성상 대리석/아이보리 스톤 (Antique Carrara Ivory Marble)
    const corpusMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#fbf9f4'),
      roughness: 0.40,
      metalness: 0.04,
    });

    // 4. 성스러운 순백 린넨 허리 천 (Perizoma / Loincloth)
    const clothMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#f8fafc'),
      roughness: 0.86,
      metalness: 0.02,
    });

    // 5. 가시면류관 다크 브론즈/철 (Crown of Thorns)
    const crownMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#291a13'),
      roughness: 0.65,
      metalness: 0.45,
    });

    // 6. 단조 대형 철못 (Forged Passion Nails)
    const nailMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0f172a'),
      roughness: 0.35,
      metalness: 0.92,
    });

    // 7. INRI 양피지 성패
    const scrollMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#fef3c7'),
      roughness: 0.60,
      metalness: 0.15,
    });

    return { woodMat, goldMat, corpusMat, clothMat, crownMat, nailMat, scrollMat };
  }, []);

  return (
    <group position={position}>
      {/* 십자가 타겟 포인트 */}
      <group ref={targetRef} position={[0, 1.8, 0.3]} />

      {/* ========================================================
          1. 8.2m 고딕 대형 목재 십자가 구조체
          ======================================================== */}
      {/* 수직 본체 기둥 (Stipes: 8.2m × 0.52m × 0.26m) */}
      <mesh castShadow receiveShadow position={[0, 0, 0]} material={materials.woodMat}>
        <boxGeometry args={[0.52, 8.2, 0.26]} />
      </mesh>

      {/* 수평 횡목 (Patibulum: 5.2m × 0.52m × 0.26m, 중심 Y=1.9m) */}
      <mesh castShadow receiveShadow position={[0, 1.9, 0.02]} material={materials.woodMat}>
        <boxGeometry args={[5.2, 0.52, 0.26]} />
      </mesh>

      {/* 십자가 외곽 황금 베벨 트림 (골드 몰딩 테두리) */}
      <mesh position={[0, 0, -0.02]} material={materials.goldMat}>
        <boxGeometry args={[0.58, 8.28, 0.22]} />
      </mesh>
      <mesh position={[0, 1.9, -0.02]} material={materials.goldMat}>
        <boxGeometry args={[5.28, 0.58, 0.22]} />
      </mesh>

      {/* 십자가 3개 끝단 고딕 트레포일 삼엽 장식 (Finials) */}
      {/* 상단 삼엽 장식 */}
      <group position={[0, 4.25, 0]}>
        <mesh position={[-0.18, 0, 0]} castShadow material={materials.goldMat}>
          <cylinderGeometry args={[0.16, 0.16, 0.24, 16]} />
        </mesh>
        <mesh position={[0.18, 0, 0]} castShadow material={materials.goldMat}>
          <cylinderGeometry args={[0.16, 0.16, 0.24, 16]} />
        </mesh>
        <mesh position={[0, 0.18, 0]} castShadow material={materials.goldMat}>
          <cylinderGeometry args={[0.16, 0.16, 0.24, 16]} />
        </mesh>
      </group>

      {/* 좌측 횡목 삼엽 장식 */}
      <group position={[-2.72, 1.9, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh position={[-0.18, 0, 0]} castShadow material={materials.goldMat}>
          <cylinderGeometry args={[0.16, 0.16, 0.24, 16]} />
        </mesh>
        <mesh position={[0.18, 0, 0]} castShadow material={materials.goldMat}>
          <cylinderGeometry args={[0.16, 0.16, 0.24, 16]} />
        </mesh>
        <mesh position={[0, 0.18, 0]} castShadow material={materials.goldMat}>
          <cylinderGeometry args={[0.16, 0.16, 0.24, 16]} />
        </mesh>
      </group>

      {/* 우측 횡목 삼엽 장식 */}
      <group position={[2.72, 1.9, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <mesh position={[-0.18, 0, 0]} castShadow material={materials.goldMat}>
          <cylinderGeometry args={[0.16, 0.16, 0.24, 16]} />
        </mesh>
        <mesh position={[0.18, 0, 0]} castShadow material={materials.goldMat}>
          <cylinderGeometry args={[0.16, 0.16, 0.24, 16]} />
        </mesh>
        <mesh position={[0, 0.18, 0]} castShadow material={materials.goldMat}>
          <cylinderGeometry args={[0.16, 0.16, 0.24, 16]} />
        </mesh>
      </group>

      {/* INRI 성패 (Titulus Crucis) */}
      <group position={[0, 3.45, 0.18]}>
        {/* 양피지 명판 본체 */}
        <mesh castShadow material={materials.scrollMat}>
          <boxGeometry args={[0.72, 0.38, 0.05]} />
        </mesh>
        {/* 황금 테두리 액자 */}
        <mesh position={[0, 0, -0.01]} material={materials.goldMat}>
          <boxGeometry args={[0.78, 0.44, 0.04]} />
        </mesh>
        {/* I · N · R · I 고대 양각 텍스트 표현 */}
        {[-0.24, -0.08, 0.08, 0.24].map((tx, ti) => (
          <mesh key={`inri-letter-${ti}`} position={[tx, 0, 0.03]} castShadow>
            <boxGeometry args={[0.07, 0.18, 0.02]} />
            <meshStandardMaterial color="#854d0e" roughness={0.3} metalness={0.7} />
          </mesh>
        ))}
      </group>

      {/* 발 받침대 (Suppedaneum) */}
      <mesh
        position={[0, -1.62, 0.18]}
        rotation={[-0.22, 0, 0]}
        castShadow
        receiveShadow
        material={materials.woodMat}
      >
        <boxGeometry args={[0.48, 0.18, 0.26]} />
      </mesh>

      {/* ========================================================
          2. 천상의 영광을 상징하는 황금빛 켈틱 후광 오라 (Aureole Halo)
          ======================================================== */}
      <group position={[0, 1.9, -0.05]}>
        {/* 켈틱 십자 후광 메인 링 */}
        <mesh>
          <ringGeometry args={[1.7, 2.1, 48]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#d97706"
            emissiveIntensity={1.8}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* 보조 오픈워크 섬세한 트림 링 */}
        <mesh position={[0, 0, 0.01]}>
          <ringGeometry args={[1.52, 1.62, 48]} />
          <meshStandardMaterial
            color="#f59e0b"
            emissive="#b45309"
            emissiveIntensity={1.2}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* 4방향 십자 성스러운 빛살 (Cruciform Rays) */}
        {[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map((rad, ri) => (
          <mesh key={`halo-ray-${ri}`} rotation={[0, 0, rad]}>
            <boxGeometry args={[0.06, 4.4, 0.01]} />
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#f59e0b"
              emissiveIntensity={2.0}
            />
          </mesh>
        ))}
      </group>

      {/* ========================================================
          3. 예수 그리스도 3D 입체 성상 (Corpus Christi)
          - 고결하고 거룩한 고딕 조각 비율
          ======================================================== */}
      <group position={[0, 0, 0.20]}>
        {/* ------------------------------------------------------
            [A. 머리, 얼굴, 가시면류관 & 흘러내린 머리카락]
            ------------------------------------------------------ */}
        <group position={[0.06, 2.05, 0.12]} rotation={[0.26, 0.16, 0.22]}>
          {/* 머리 두상 (Serene Head) */}
          <mesh castShadow receiveShadow material={materials.corpusMat}>
            <sphereGeometry args={[0.23, 20, 20]} />
          </mesh>

          {/* 거룩한 이목구비 및 턱수염 윤곽 */}
          <mesh position={[0, -0.16, 0.12]} rotation={[0.2, 0, 0]} castShadow material={materials.corpusMat}>
            <capsuleGeometry args={[0.08, 0.14, 8, 12]} />
          </mesh>

          {/* 가시면류관 (Crown of Thorns: 땋은 가시 링) */}
          <mesh position={[0, 0.08, 0]} rotation={[0.15, 0, 0]} castShadow material={materials.crownMat}>
            <torusGeometry args={[0.22, 0.038, 12, 32]} />
          </mesh>
          {/* 가시면류관 돌출된 가시들 (Thorn Spurs) */}
          {[0, 0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6].map((angle, i) => (
            <mesh
              key={`thorn-${i}`}
              position={[Math.cos(angle) * 0.24, 0.08, Math.sin(angle) * 0.24]}
              rotation={[0, -angle, Math.PI / 4]}
              castShadow
              material={materials.crownMat}
            >
              <coneGeometry args={[0.018, 0.08, 4]} />
            </mesh>
          ))}

          {/* 양 어깨로 흘러내리는 성스러운 머리카락 (Hair Locks) */}
          <mesh position={[-0.14, -0.18, -0.06]} rotation={[0, 0, -0.2]} castShadow material={materials.crownMat}>
            <capsuleGeometry args={[0.045, 0.32, 8, 12]} />
          </mesh>
          <mesh position={[0.16, -0.20, -0.05]} rotation={[0, 0, 0.18]} castShadow material={materials.crownMat}>
            <capsuleGeometry args={[0.045, 0.34, 8, 12]} />
          </mesh>
        </group>

        {/* 목 (Neck) */}
        <mesh position={[0.02, 1.86, 0.06]} rotation={[0.12, 0, 0.08]} castShadow material={materials.corpusMat}>
          <cylinderGeometry args={[0.11, 0.13, 0.26, 16]} />
        </mesh>

        {/* ------------------------------------------------------
            [B. 양팔, 손바닥 및 대형 성정 (Arms, Hands & Passion Nails)]
            - 십자가 보를 따라 시원하게 뻗은 양팔
            ------------------------------------------------------ */}
        {/* 좌측 팔 (Left Arm: -X 방향으로 뻗음, 7도 상향) */}
        <group position={[-0.24, 1.84, 0.04]}>
          {/* 좌측 어깨 삼각근 */}
          <mesh position={[-0.15, 0.02, 0]} castShadow material={materials.corpusMat}>
            <sphereGeometry args={[0.11, 12, 12]} />
          </mesh>
          {/* 좌측 상완 (Upper Arm) */}
          <mesh
            position={[-0.62, 0.06, 0]}
            rotation={[0, 0, Math.PI / 2 - 0.12]}
            castShadow
            material={materials.corpusMat}
          >
            <cylinderGeometry args={[0.092, 0.084, 0.82, 16]} />
          </mesh>
          {/* 좌측 팔꿈치 */}
          <mesh position={[-1.04, 0.11, 0]} castShadow material={materials.corpusMat}>
            <sphereGeometry args={[0.088, 12, 12]} />
          </mesh>
          {/* 좌측 전완 (Forearm) */}
          <mesh
            position={[-1.48, 0.17, 0]}
            rotation={[0, 0, Math.PI / 2 - 0.14]}
            castShadow
            material={materials.corpusMat}
          >
            <cylinderGeometry args={[0.084, 0.076, 0.80, 16]} />
          </mesh>
          {/* 좌측 손바닥 (Nailed Left Palm) */}
          <mesh position={[-1.94, 0.24, 0.02]} rotation={[0, 0.2, 0.1]} castShadow material={materials.corpusMat}>
            <boxGeometry args={[0.18, 0.14, 0.06]} />
          </mesh>
          {/* 좌측 손바닥을 관통한 대형 철못 (Passion Nail) */}
          <mesh position={[-1.94, 0.24, 0.07]} rotation={[Math.PI / 2, 0, 0]} castShadow material={materials.nailMat}>
            <cylinderGeometry args={[0.038, 0.025, 0.22, 6]} />
          </mesh>
        </group>

        {/* 우측 팔 (Right Arm: +X 방향으로 뻗음, 7도 상향) */}
        <group position={[0.24, 1.84, 0.04]}>
          {/* 우측 어깨 삼각근 */}
          <mesh position={[0.15, 0.02, 0]} castShadow material={materials.corpusMat}>
            <sphereGeometry args={[0.11, 12, 12]} />
          </mesh>
          {/* 우측 상완 (Upper Arm) */}
          <mesh
            position={[0.62, 0.06, 0]}
            rotation={[0, 0, -Math.PI / 2 + 0.12]}
            castShadow
            material={materials.corpusMat}
          >
            <cylinderGeometry args={[0.092, 0.084, 0.82, 16]} />
          </mesh>
          {/* 우측 팔꿈치 */}
          <mesh position={[1.04, 0.11, 0]} castShadow material={materials.corpusMat}>
            <sphereGeometry args={[0.088, 12, 12]} />
          </mesh>
          {/* 우측 전완 (Forearm) */}
          <mesh
            position={[1.48, 0.17, 0]}
            rotation={[0, 0, -Math.PI / 2 + 0.14]}
            castShadow
            material={materials.corpusMat}
          >
            <cylinderGeometry args={[0.084, 0.076, 0.80, 16]} />
          </mesh>
          {/* 우측 손바닥 (Nailed Right Palm) */}
          <mesh position={[1.94, 0.24, 0.02]} rotation={[0, -0.2, -0.1]} castShadow material={materials.corpusMat}>
            <boxGeometry args={[0.18, 0.14, 0.06]} />
          </mesh>
          {/* 우측 손바닥을 관통한 대형 철못 (Passion Nail) */}
          <mesh position={[1.94, 0.24, 0.07]} rotation={[Math.PI / 2, 0, 0]} castShadow material={materials.nailMat}>
            <cylinderGeometry args={[0.038, 0.025, 0.22, 6]} />
          </mesh>
        </group>

        {/* ------------------------------------------------------
            [C. 흉곽, 가슴, 복부 및 성스러운 창상 (Torso & Ribs)]
            ------------------------------------------------------ */}
        {/* 상부 흉곽 (Chest & Clavicle Arch) */}
        <mesh position={[0, 1.62, 0.06]} rotation={[0.06, 0, 0]} castShadow receiveShadow material={materials.corpusMat}>
          <boxGeometry args={[0.54, 0.44, 0.26]} />
        </mesh>
        {/* 대흉근 입체감 (Pectoral Muscles) */}
        <mesh position={[-0.14, 1.64, 0.18]} castShadow material={materials.corpusMat}>
          <sphereGeometry args={[0.13, 14, 14]} />
        </mesh>
        <mesh position={[0.14, 1.64, 0.18]} castShadow material={materials.corpusMat}>
          <sphereGeometry args={[0.13, 14, 14]} />
        </mesh>

        {/* 중부 갈비뼈 흉곽 (Ribcage) */}
        <mesh position={[0, 1.28, 0.05]} castShadow receiveShadow material={materials.corpusMat}>
          <boxGeometry args={[0.48, 0.42, 0.24]} />
        </mesh>

        {/* 우측 옆구리의 거룩한 창상 (Sacred Lance Wound on Right Rib) */}
        <mesh position={[0.18, 1.34, 0.16]} rotation={[0, 0, -0.3]} castShadow>
          <boxGeometry args={[0.08, 0.022, 0.02]} />
          <meshStandardMaterial color="#7f1d1d" roughness={0.3} metalness={0.2} />
        </mesh>

        {/* 하부 복부 (Abdomen & Waist) */}
        <mesh position={[0, 0.98, 0.04]} rotation={[-0.04, 0, 0]} castShadow receiveShadow material={materials.corpusMat}>
          <boxGeometry args={[0.42, 0.36, 0.22]} />
        </mesh>

        {/* ------------------------------------------------------
            [D. 성스러운 순백 린넨 허리 천 (Perizoma / Loincloth)]
            - 우아한 드레이프 주름과 우측 허리 매듭
            ------------------------------------------------------ */}
        <group position={[0, 0.68, 0.05]}>
          {/* 허리를 감싸는 메인 린넨 천 */}
          <mesh castShadow receiveShadow material={materials.clothMat}>
            <cylinderGeometry args={[0.34, 0.38, 0.46, 20]} />
          </mesh>
          {/* 가로 방향 주름 밴드 (Pleated Fold Band) */}
          <mesh position={[0, 0.12, 0.04]} castShadow material={materials.clothMat}>
            <cylinderGeometry args={[0.36, 0.36, 0.12, 20]} />
          </mesh>
          {/* 우측 허리 묶음 매듭 (Side Knot) */}
          <mesh position={[0.32, 0.08, 0.12]} castShadow material={materials.clothMat}>
            <sphereGeometry args={[0.10, 12, 12]} />
          </mesh>
          {/* 매듭에서 오른쪽 아래로 늘어진 주름진 천 자락 (Trailing Drape Folds) */}
          <mesh
            position={[0.34, -0.24, 0.14]}
            rotation={[0.12, 0, -0.22]}
            castShadow
            material={materials.clothMat}
          >
            <coneGeometry args={[0.14, 0.54, 8]} />
          </mesh>
        </group>

        {/* ------------------------------------------------------
            [E. 양다리, 겹쳐진 발 및 단조 철못 (Legs, Feet & Nail)]
            - 고딕 콘트라포스토 (무릎을 살짝 앞으로 굽힌 곡선미)
            ------------------------------------------------------ */}
        {/* 좌측 허벅지 (Left Thigh) */}
        <mesh
          position={[-0.12, 0.24, 0.08]}
          rotation={[0.12, 0, -0.04]}
          castShadow
          receiveShadow
          material={materials.corpusMat}
        >
          <cylinderGeometry args={[0.11, 0.095, 0.68, 16]} />
        </mesh>
        {/* 우측 허벅지 (Right Thigh) */}
        <mesh
          position={[0.12, 0.24, 0.08]}
          rotation={[0.12, 0, 0.04]}
          castShadow
          receiveShadow
          material={materials.corpusMat}
        >
          <cylinderGeometry args={[0.11, 0.095, 0.68, 16]} />
        </mesh>

        {/* 좌우 무릎 (Knees: 앞으로 살짝 돌출) */}
        <mesh position={[-0.11, -0.16, 0.14]} castShadow material={materials.corpusMat}>
          <sphereGeometry args={[0.092, 12, 12]} />
        </mesh>
        <mesh position={[0.11, -0.16, 0.14]} castShadow material={materials.corpusMat}>
          <sphereGeometry args={[0.092, 12, 12]} />
        </mesh>

        {/* 좌측 정강이 (Left Shin: 안쪽으로 모임) */}
        <mesh
          position={[-0.08, -0.66, 0.11]}
          rotation={[-0.14, 0, 0.06]}
          castShadow
          receiveShadow
          material={materials.corpusMat}
        >
          <cylinderGeometry args={[0.088, 0.072, 0.84, 16]} />
        </mesh>
        {/* 우측 정강이 (Right Shin: 왼발 위에 겹쳐짐) */}
        <mesh
          position={[0.06, -0.66, 0.13]}
          rotation={[-0.14, 0, -0.06]}
          castShadow
          receiveShadow
          material={materials.corpusMat}
        >
          <cylinderGeometry args={[0.088, 0.072, 0.84, 16]} />
        </mesh>

        {/* 포개어진 두 발 (Crossed Pierced Feet on Suppedaneum) */}
        {/* 아래에 받쳐진 왼발 */}
        <mesh position={[-0.02, -1.22, 0.14]} rotation={[0.42, 0, 0]} castShadow material={materials.corpusMat}>
          <boxGeometry args={[0.11, 0.28, 0.10]} />
        </mesh>
        {/* 위에 겹쳐진 오른발 */}
        <mesh position={[0.03, -1.18, 0.18]} rotation={[0.45, 0.12, 0.14]} castShadow material={materials.corpusMat}>
          <boxGeometry args={[0.11, 0.28, 0.10]} />
        </mesh>

        {/* 양발을 함께 관통하여 십자가에 고정한 단조 대형 철못 (Crucifixion Nail on Feet) */}
        <mesh
          position={[0.02, -1.20, 0.26]}
          rotation={[Math.PI / 2 + 0.35, 0, 0]}
          castShadow
          material={materials.nailMat}
        >
          <cylinderGeometry args={[0.042, 0.025, 0.26, 6]} />
        </mesh>
      </group>

      {/* ========================================================
          4. 십자가상 전용 성스러운 집중 조명 (Sacred Illumination)
          ======================================================== */}
      {/* 십자가를 밝히는 따뜻하고 고결한 포인트 라이트 */}
      <pointLight
        position={[0, 1.8, 2.6]}
        intensity={3.8}
        color="#fef3c7"
        distance={14}
        decay={2}
      />
      {/* 십자가 뒤 북측 벽면에 은은한 황금 아우라를 만드는 백라이트 */}
      <pointLight
        position={[0, 1.9, -0.25]}
        intensity={2.2}
        color="#f59e0b"
        distance={8}
        decay={2}
      />
    </group>
  );
}
