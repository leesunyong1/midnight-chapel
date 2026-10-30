'use client';

import { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import Link from 'next/link';

// 캐릭터 3D 모델 컴포넌트
function ChibiModel({
  wireframe,
  showSkeleton,
  autoRotate,
}: {
  wireframe: boolean;
  showSkeleton: boolean;
  autoRotate: boolean;
}) {
  const { scene } = useGLTF('/character/chibi.glb');
  const groupRef = useRef<THREE.Group>(null);
  const skeletonHelperRef = useRef<THREE.SkeletonHelper | null>(null);

  // 머티리얼 와이어프레임 및 그림자 설정
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat: any) => {
              mat.wireframe = wireframe;
            });
          } else {
            child.material.wireframe = wireframe;
          }
        }
      }
    });
  }, [scene, wireframe]);

  // 스켈레톤 헬퍼 생성 및 업데이트
  useEffect(() => {
    if (showSkeleton && groupRef.current) {
      const helper = new THREE.SkeletonHelper(scene);
      skeletonHelperRef.current = helper;
    } else {
      skeletonHelperRef.current = null;
    }
  }, [showSkeleton, scene]);

  // 자동 회전
  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <primitive object={scene} />
      {showSkeleton && skeletonHelperRef.current && (
        <primitive object={skeletonHelperRef.current} />
      )}
    </group>
  );
}

// 로딩 표시 컴포넌트
function Loader() {
  return (
    <mesh position={[0, 0.24, 0]}>
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      <meshStandardMaterial color="#f59e0b" wireframe />
    </mesh>
  );
}

export default function ChibiCharacterPreview() {
  const [wireframe, setWireframe] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative w-screen h-screen bg-[#090a0f] overflow-hidden select-none">
      {/* Three.js R3F Canvas */}
      {!hasError ? (
        <Canvas
          shadows
          camera={{ position: [0, 0.4, 1.2], fov: 45 }}
          className="w-full h-full"
        >
          {/* 어두운 심야 스튜디오 배경 */}
          <color attach="background" args={['#0a0b10']} />
          <fog attach="fog" args={['#0a0b10', 2, 8]} />

          {/* 조명 구성 */}
          {/* 1. 은은한 앰비언트 라이트 */}
          <ambientLight intensity={0.4} color="#dbeafe" />

          {/* 2. 주광 (Key Light: 정면 상단 따뜻한 조명) */}
          <directionalLight
            position={[1.5, 2.5, 1.5]}
            intensity={1.8}
            color="#fffbeb"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-near={0.1}
            shadow-camera-far={10}
            shadow-camera-left={-1}
            shadow-camera-right={1}
            shadow-camera-top={1}
            shadow-camera-bottom={-1}
          />

          {/* 3. 보조광 (Fill Light: 측면 차가운 조명) */}
          <directionalLight
            position={[-1.5, 1.5, -0.5]}
            intensity={0.8}
            color="#38bdf8"
          />

          {/* 4. 후광 (Rim Light: 실루엣 강조) */}
          <pointLight
            position={[0, 1.5, -1.2]}
            intensity={2.0}
            color="#f59e0b"
            distance={4}
          />

          {/* 바닥 원형 접지 그리드 */}
          <gridHelper
            args={[3, 30, '#334155', '#1e293b']}
            position={[0, -0.001, 0]}
          />

          {/* 그림자를 받는 바닥 메쉬 */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.002, 0]}
            receiveShadow
          >
            <planeGeometry args={[6, 6]} />
            <shadowMaterial opacity={0.4} />
          </mesh>

          {/* 캐릭터 모델 (Suspense 로딩) */}
          <Suspense fallback={<Loader />}>
            <ChibiModel
              wireframe={wireframe}
              showSkeleton={showSkeleton}
              autoRotate={autoRotate}
            />
          </Suspense>

          {/* 카메라 컨트롤 (타겟: 캐릭터 상체 중심 y=0.24m) */}
          <OrbitControls
            target={[0, 0.24, 0]}
            minDistance={0.4}
            maxDistance={3.5}
            maxPolarAngle={Math.PI / 2 + 0.05} // 바닥 밑으로 지나치게 꺼지지 않도록 제한
            enableDamping
            dampingFactor={0.05}
          />
        </Canvas>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full border border-red-500/30 bg-red-950/40 flex items-center justify-center mb-4 text-red-400">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-lg font-light text-stone-200">
            모델을 불러오지 못했습니다
          </h2>
          <p className="mt-2 text-xs text-stone-500 max-w-sm">
            `public/character/chibi.glb` 파일이 존재하는지 확인해 주세요.
          </p>
          <button
            onClick={() => setHasError(false)}
            className="mt-4 px-4 py-2 rounded-xl bg-stone-800 text-xs text-stone-300 hover:text-white"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 상단 네비게이션 */}
      <header className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-stone-800 bg-stone-900/80 backdrop-blur-md px-3.5 py-1.5 text-xs text-stone-300 hover:text-white transition-all active:scale-95"
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
          <span className="text-xs text-stone-500 hidden sm:inline">
            /character-preview
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
              showInfo
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-stone-900/70 text-stone-400 border-stone-800 hover:text-stone-200'
            }`}
          >
            {showInfo ? '스펙 패널 숨기기' : '모델 스펙 보기'}
          </button>
        </div>
      </header>

      {/* 우측 상단 모델 스펙 패널 */}
      {showInfo && (
        <aside className="absolute top-20 right-6 z-20 w-80 max-h-[calc(100vh-140px)] overflow-y-auto rounded-2xl border border-stone-800/80 bg-stone-950/85 backdrop-blur-xl p-5 text-xs shadow-2xl animate-fade-in pointer-events-auto">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <h3 className="font-medium text-stone-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>치비 캐릭터 모델 분석</span>
            </h3>
            <span className="text-[10px] text-stone-500 font-mono">chibi.glb</span>
          </div>

          <div className="mt-4 space-y-3 font-light text-stone-400">
            {/* 기본 제원 */}
            <div className="rounded-xl bg-stone-900/60 p-3 border border-stone-800/60">
              <span className="text-[11px] text-amber-400 font-medium block mb-1.5">
                📏 크기 및 바운딩 박스
              </span>
              <div className="grid grid-cols-3 gap-2 text-[11px] text-stone-300">
                <div>
                  <span className="text-stone-500 block">가로(X)</span>
                  <span className="font-mono text-emerald-400">0.42 m</span>
                </div>
                <div>
                  <span className="text-stone-500 block">높이(Y)</span>
                  <span className="font-mono text-emerald-400">0.47 m</span>
                </div>
                <div>
                  <span className="text-stone-500 block">깊이(Z)</span>
                  <span className="font-mono text-emerald-400">0.27 m</span>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-stone-500 leading-relaxed">
                ※ 치비 특유의 2.5등신 비율로, 발바닥 접지면(Y=0)이 정확히 정렬되어 있습니다.
              </p>
            </div>

            {/* 리깅 및 스켈레톤 */}
            <div className="rounded-xl bg-stone-900/60 p-3 border border-stone-800/60">
              <span className="text-[11px] text-sky-400 font-medium block mb-1.5">
                🦴 리깅 (Skeleton & Bones)
              </span>
              <div className="flex items-center justify-between text-stone-300 mb-1">
                <span>리깅 여부</span>
                <span className="text-emerald-400 font-medium">✅ 완료 (Rigged)</span>
              </div>
              <div className="flex items-center justify-between text-stone-300 mb-1">
                <span>SkinnedMesh</span>
                <span className="font-mono">2개</span>
              </div>
              <div className="flex items-center justify-between text-stone-300">
                <span>본(Bone / Joints)</span>
                <span className="font-mono text-sky-300">32개 (휴머노이드 골격)</span>
              </div>
              <p className="mt-2 text-[10px] text-stone-500 leading-relaxed">
                골반(Hips), 척추(Spine), 목, 머리, 어깨, 팔, 손, 손가락, 다리, 발, 발가락 본까지 표준 풀 리깅되어 있습니다.
              </p>
            </div>

            {/* 애니메이션 상태 */}
            <div className="rounded-xl bg-stone-900/60 p-3 border border-stone-800/60">
              <span className="text-[11px] text-purple-400 font-medium block mb-1.5">
                🎬 내장 애니메이션
              </span>
              <div className="flex items-center justify-between text-stone-300 mb-1">
                <span>클립 개수</span>
                <span className="font-mono text-stone-400">0개 (클립 없음)</span>
              </div>
              <p className="mt-1 text-[10px] text-stone-400 leading-relaxed">
                현재 모델은 **베이스 리깅 모델(Base Rigged Mesh)**로 애니메이션 클립이 내장되어 있지 않습니다.
              </p>
              <div className="mt-2 p-2 rounded-lg bg-purple-950/30 border border-purple-500/20 text-[10px] text-purple-300 leading-relaxed">
                💡 <strong>향후 이동/기도 연동 팁</strong>:
                골격(32개 본)이 이미 완성되어 있으므로, 코드로 본 회전을 직접 제어(절차적 걷기/기도 애니메이션)하거나 Mixamo FBX 애니메이션을 리타겟팅하여 연결할 수 있습니다.
              </div>
            </div>

            {/* 메시 및 머티리얼 */}
            <div className="rounded-xl bg-stone-900/60 p-3 border border-stone-800/60 text-[11px]">
              <span className="text-stone-300 font-medium block mb-1">
                메시 & 머티리얼
              </span>
              <ul className="space-y-1 text-stone-400 text-[10px]">
                <li>• 바디 메시: <code className="text-stone-300">SM_Chibi_Body</code> (핑크 PBR)</li>
                <li>• 안구 메시: <code className="text-stone-300">SM_Chibi_Eye</code> (블랙 PBR)</li>
                <li>• 외부 텍스처 파일: 없음 (단색 PBR 파라미터 적용)</li>
              </ul>
            </div>
          </div>
        </aside>
      )}

      {/* 하단 뷰 컨트롤 바 */}
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
            <span>{showSkeleton ? '스켈레톤 끄기' : '스켈레톤(본) 보기'}</span>
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
        <p>• 마우스 좌클릭 드래그: 360도 카메라 궤도 회전</p>
        <p>• 마우스 휠 스크롤: 줌 인 / 줌 아웃</p>
        <p>• 마우스 우클릭 드래그: 시점 이동 (Pan)</p>
      </div>
    </div>
  );
}

// Next.js 사전 프리로드 최적화
useGLTF.preload('/character/chibi.glb');
