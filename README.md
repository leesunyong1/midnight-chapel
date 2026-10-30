# 🕯️ 심야 성당 (Midnight Chapel)

고요한 촛불 아래, 나만의 기도를 봉헌하고 함께 기도하는 **웹 3D 인터랙티브 성당 서비스**입니다.  
Next.js 16과 React Three Fiber(Three.js)를 기반으로 구축되었으며, 별도의 앱 설치 없이 웹 브라우저에서 3D 캐릭터를 조작하여 개인 기도실과 대성당을 체험할 수 있습니다.

* **🌐 배포 사이트 (Live Demo)**: [https://midnight-chapel.vercel.app](https://midnight-chapel.vercel.app)
* **🐙 GitHub 저장소**: [https://github.com/leesunyong1/midnight-chapel](https://github.com/leesunyong1/midnight-chapel)

---

## 🏛️ 주요 공간 및 기능

### 1. 🕯️ 개인 기도실 (Private Chapel — 12m × 16m × 7.5m)
* **단독 1인 전용 고딕 기도 공간**:
  * 플래그스톤 석재 바닥과 금사 자수 테두리의 버건디 벨벳 런너 카펫
  * 배럴 볼트(Barrel Vault) 천장, 아치 리브 및 중앙 펜던트 철제 링 샹들리에
  * 카라라 백색 대리석 제단, 제단보 및 황동 성작(Chalice) 소품
  * 앤틱 다크 월넛 & 금빛 베벨 테두리의 고딕 십자가와 후광 링
  * 고딕 단독 기도대(Prie-Dieu)와 성경책, 황동 촛대 및 단조 철제 다단 봉헌대
* **인터랙션**:
  * 제단 접근 시 안내 프롬프트 및 `[E]`키 / 버튼으로 기도문 작성 모달 호출
  * 제단 촛불 켜기 / 끄기 토글 및 로컬 스토리지 연동
  * '나의 기도' 기록 서랍(Drawer)을 통한 봉헌 내역 조회/수정/삭제

### 2. 🏛️ 공동 기도실 (Grand Community Cathedral — 30m × 45m × 20m)
* **웅장한 고딕 대성당**:
  * 5.6m 폭의 넓은 중앙 버건디 카펫 복도 ($X \in [-2.8\text{m}, +2.8\text{m}]$)
  * 좌우 16개 고딕 장의자 (폭 3.4m, 찬송가 선반 및 찬송가책 소품)
  * 12개 고딕 클러스터드 다발 기둥(Clustered Piers) 및 기둥-장의자 사이 0.4m 틈새 통행 차단
  * 기둥 외측 6.7m 폭의 쾌적한 양측 회랑(Side Aisles)
  * 북측 벽면 직경 7m 대형 고딕 장미창(Rose Window) 및 12개 란셋 스테인드글라스 창문
  * 2단 성단 단상, 5.2m 대형 대리석 제단, 석조 레타블(Reredos) 및 7m 대형 십자가
* **60개 스폰 시스템**:
  * 입구 광장(Narthex)에 15열 × 4행 = 총 60개 스폰 지점 완비
  * 기둥/외벽 충돌 간섭 0건 검증, 중복 스폰 방지 및 가용 슬롯 자동 배정
  * 바닥 룬 링 마커 시각화 및 랜덤 스폰 테스트 UI 지원

### 3. 🏃 캐릭터 관절 애니메이션 및 물리 조작 시스템
* **치비 캐릭터 16개 관절 기반 애니메이션 (STEP 4)**:
  * 단순 메쉬 흔들림이 아닌 GLB Skeleton 실제 Bone 회전 제어
  * **다리**: 허벅지(`Left_UpLeg_00`, `RightUpLeg_024`) 양다리 교차 스윙, 무릎(`Left_Leg_028`, `RightLeg_025`) 후방 굽힘, 발목(`Left_Foot_029`, `RightFoot_026`) 착지 각도 제어
  * **팔**: 상완(`Left_Arm_017`, `RightArm_09`) 다리 반대위상 교차 스윙, 전완/팔꿈치(`Left_ForeArm_018`, `RightForeArm_010`) 전방 굽힘
  * **체간**: 골반(`Hips_01`) 롤/비틀림, 척추(`Spine_02`, `Spine1_03`, `Spine2_04`) 역보정 및 호흡 팽창, 목/머리(`Neck_05`, `Head_06`) 시선 수평 안정화
  * **Rest Pose 상대 회전**: `restQuat.multiply(deltaQuat)` 기반으로 매 프레임 누적 오차 없이 원점 복귀
  * **월드 변위 기반 보행 판정**: 벽이나 장애물에 가로막혀 실제 이동 거리가 0이면 자동으로 제자리걸음(문워크)을 차단하고 IDLE로 부드럽게 전이
  * **Skeleton 독립성**: `SkeletonUtils.clone` 기반 다중 플레이어 독립 인스턴스 보장
  * **Zero-GC**: `useFrame` 내 객체 생성 없이 재사용 스크래치 벡터/쿼터니언 활용
* **축 분리 슬라이딩 충돌 (Sliding Collision)**:
  * 벽면, 장의자, 기둥 충돌 시 멈추지 않고 벽을 따라 미끄러지는 자연스러운 슬라이딩 물리
* **3인칭 자유 궤도 카메라**:
  * 마우스 좌클릭/모바일 한 손가락 드래그 360° 시점 회전
  * 마우스 휠 스크롤 및 모바일 핀치 줌인/줌아웃
* **크로스 플랫폼 입력**:
  * WASD, 방향키, 한글 자음(ㅈ,ㄴ,ㅁ,ㅇ) 및 모바일 가상 조이스틱 완벽 지원

---

## 🛠️ 기술 스택

* **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
* **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
* **3D Graphics**: [Three.js](https://threejs.org/), [@react-three/fiber](https://r3f.docs.pmnd.rs/), [@react-three/drei](https://github.com/pmndrs/drei)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
* **Storage**: LocalStorage 기반 지속성 관리 (기도문, 촛불 상태, 묵상 타이머)

---

## 🚀 로컬 실행 방법

```bash
# 1. 패키지 설치
npm install

# 2. 개발 서버 실행
npm run dev

# 3. 브라우저 접속
# http://localhost:3000
```

### 프로덕션 빌드
```bash
npm run build
npm start
```

---

## 📁 디렉터리 구조

```text
├── app/
│   ├── page.tsx                  # 성당 입구 랜딩 페이지
│   ├── private-prayer/           # 개인 기도실 페이지
│   ├── community-prayer/         # 공동 기도실 페이지
│   └── character-preview/        # 치비 캐릭터 리그 및 스펙 프리뷰
├── components/
│   ├── character/
│   │   ├── ChibiPlayer.tsx       # 공용 치비 플레이어 (이동/애니메이션/충돌)
│   │   └── ChibiCharacterPreview.tsx
│   ├── prayer/
│   │   ├── PrivateChapelScene.tsx        # 개인 기도실 3D 공간 (12x16x7.5m)
│   │   ├── CommunityCathedralScene.tsx   # 공동 기도실 3D 대성당 (30x45x20m)
│   │   ├── PrivatePrayer3DCanvas.tsx     # 개인 기도실 인터랙티브 캔버스
│   │   ├── CommunityPrayer3DCanvas.tsx   # 공동 기도실 인터랙티브 캔버스
│   │   ├── ThirdPersonCamera.tsx         # 3인칭 궤도/줌 카메라
│   │   ├── collisionUtils.ts             # 축 분리 슬라이딩 충돌 유틸
│   │   ├── spawnSystem.ts                # 60개 스폰 지점 생성 및 관리
│   │   └── proceduralTextures.ts         # 절차적 PBR 텍스처 엔진
│   └── ui/
│       └── VirtualJoystick.tsx   # 모바일 터치 가상 조이스틱
├── lib/storage/                  # 기도문 및 촛불 로컬 스토리지
└── public/
    └── character/chibi.glb       # 치비 3D 모델
```

---

## 📄 라이선스

* 3D Character Model: `Free Pack - Chibi Base Mesh (Rigged)` by DuNguyn Studio (CC-BY-4.0)

