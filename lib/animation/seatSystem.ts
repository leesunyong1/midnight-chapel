export interface SeatTarget {
  /** 좌석 고유 식별자 */
  id: string;
  /** 사용자 친화적 명칭 (예: '좌측 장의자 3열 (통로측)') */
  label: string;
  /** 좌석 종류: 장의자(pew) 또는 무릎 기도대(kneeler) */
  type: 'pew' | 'kneeler';
  /** 의자 기준 좌표 [x, y, z] */
  seatPosition: [number, number, number];
  /** 의자가 바라보는 Y축 회전각 (라디안, 기본 Math.PI = 제단 바라보기) */
  seatRotation: number;
  /** 좌석 높이 (장의자 약 0.46m, 무릎 쿠션 약 0.14m) */
  seatHeight: number;
  /** 앉았을 때 캐릭터가 위치할 월드 좌표 [x, y, z] */
  characterSitPosition: [number, number, number];
  /** 일어났을 때 안전하게 복귀할 앞쪽 통로 좌표 [x, y, z] (충돌체 바깥 안전 구역) */
  characterStandExitPosition: [number, number, number];
  /** 상호작용 감지 반경 (미터 단위) */
  interactionRange: number;
  /** 현재 다른 캐릭터가 사용 중인지 여부 */
  isOccupied: boolean;
}

// 대성당 장의자 8열 Z 좌표
const CATHEDRAL_PEW_Z_ROWS = [-13.5, -10.0, -6.5, -3.0, 0.5, 4.0, 7.5, 11.0];

/**
 * 3D 대성당(공동 기도실)의 모든 좌석 상호작용 목록 생성 (8열 × 좌우 2개 × 각 3좌석 = 총 48개 좌석)
 */
export function generateCommunityCathedralSeats(): SeatTarget[] {
  const seats: SeatTarget[] = [];

  CATHEDRAL_PEW_Z_ROWS.forEach((z, rowIdx) => {
    const rowNum = rowIdx + 1;

    // 좌측 장의자 (중심 X = -4.5m)
    const leftOffsets = [
      { x: -3.4, name: '통로측' },
      { x: -4.5, name: '중앙' },
      { x: -5.6, name: '벽측' },
    ];
    leftOffsets.forEach((spot, spotIdx) => {
      seats.push({
        id: `cathedral-seat-L-r${rowNum}-s${spotIdx + 1}`,
        label: `서측 ${rowNum}열 장의자 (${spot.name})`,
        type: 'pew',
        seatPosition: [spot.x, 0.46, z],
        seatRotation: Math.PI, // 제단 및 십자가(음수 Z)를 정면으로 바라봄
        seatHeight: 0.46,
        characterSitPosition: [spot.x, 0, z],
        characterStandExitPosition: [spot.x, 0, z - 0.85], // 장의자 앞 통로로 안전하게 퇴장
        interactionRange: 1.35,
        isOccupied: false,
      });
    });

    // 우측 장의자 (중심 X = +4.5m)
    const rightOffsets = [
      { x: 3.4, name: '통로측' },
      { x: 4.5, name: '중앙' },
      { x: 5.6, name: '벽측' },
    ];
    rightOffsets.forEach((spot, spotIdx) => {
      seats.push({
        id: `cathedral-seat-R-r${rowNum}-s${spotIdx + 1}`,
        label: `동측 ${rowNum}열 장의자 (${spot.name})`,
        type: 'pew',
        seatPosition: [spot.x, 0.46, z],
        seatRotation: Math.PI,
        seatHeight: 0.46,
        characterSitPosition: [spot.x, 0, z],
        characterStandExitPosition: [spot.x, 0, z - 0.85],
        interactionRange: 1.35,
        isOccupied: false,
      });
    });
  });

  return seats;
}

/**
 * 개인 기도실 전용 상호작용 좌석 및 기도대 목록 생성
 */
export function generatePrivateChapelSeats(): SeatTarget[] {
  return [
    {
      id: 'private-kneeler-main',
      label: '단독 고딕 개인 기도대',
      type: 'kneeler',
      seatPosition: [0, 0.14, -3.58],
      seatRotation: Math.PI,
      seatHeight: 0.14,
      characterSitPosition: [0, 0, -3.58],
      characterStandExitPosition: [0, 0, -3.0],
      interactionRange: 1.35,
      isOccupied: false,
    },
    {
      id: 'private-altar-kneel',
      label: '제단 앞 무릎 기도대',
      type: 'kneeler',
      seatPosition: [0, 0.08, -5.0],
      seatRotation: Math.PI,
      seatHeight: 0.08,
      characterSitPosition: [0, 0, -5.0],
      characterStandExitPosition: [0, 0, -4.4],
      interactionRange: 1.35,
      isOccupied: false,
    },
  ];
}

/**
 * 현재 플레이어 좌표로부터 가장 가까운 상호작용 가능 좌석 탐색
 */
export function findNearestSeat(
  playerPos: { x: number; z: number },
  seats: SeatTarget[],
  maxRange = 1.35
): SeatTarget | null {
  let nearest: SeatTarget | null = null;
  let minDistanceSq = maxRange * maxRange;

  for (const seat of seats) {
    if (seat.isOccupied) continue;

    // 좌석 또는 좌석 앞 출구 좌표와의 거리 중 최소값 계산
    const [sx, , sz] = seat.seatPosition;
    const [ex, , ez] = seat.characterStandExitPosition;

    const dx1 = playerPos.x - sx;
    const dz1 = playerPos.z - sz;
    const distSq1 = dx1 * dx1 + dz1 * dz1;

    const dx2 = playerPos.x - ex;
    const dz2 = playerPos.z - ez;
    const distSq2 = dx2 * dx2 + dz2 * dz2;

    const bestDistSq = Math.min(distSq1, distSq2);

    if (bestDistSq < minDistanceSq) {
      minDistanceSq = bestDistSq;
      nearest = seat;
    }
  }

  return nearest;
}
