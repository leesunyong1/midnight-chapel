import { Collider, RoomBounds, isCollidingWithAny } from './collisionUtils';

export interface SpawnPoint {
  id: number;
  col: number; // 0 to 14 (15 columns)
  row: number; // 0 to 3 (4 rows)
  x: number;
  z: number;
}

/**
 * 60 Spawn Points for Community Cathedral
 * - 15 columns × 4 rows
 * - X coordinates: -10.5m to +10.5m in 1.5m intervals
 * - Z coordinates: +17.5m, +18.5m, +19.5m, +20.5m
 */
export const COMMUNITY_SPAWN_POINTS: SpawnPoint[] = [];

const X_START = -10.5;
const X_STEP = 1.5;
const COLS = 15;
const Z_ROWS = [17.5, 18.5, 19.5, 20.5];

let idCounter = 0;
for (let r = 0; r < Z_ROWS.length; r++) {
  const z = Z_ROWS[r];
  for (let c = 0; c < COLS; c++) {
    const x = Number((X_START + c * X_STEP).toFixed(2));
    COMMUNITY_SPAWN_POINTS.push({
      id: idCounter++,
      col: c,
      row: r,
      x,
      z,
    });
  }
}

/**
 * Returns an available spawn point from the 60 points.
 * If preferredId is specified and available, returns it.
 * Otherwise, chooses the closest or first available unoccupied spawn point.
 */
export function getAvailableSpawnPoint(
  occupiedIds: Set<number> | number[] = new Set(),
  preferredId?: number
): SpawnPoint {
  const occupiedSet =
    occupiedIds instanceof Set ? occupiedIds : new Set(occupiedIds);

  // If preferred is available, return it
  if (
    preferredId !== undefined &&
    preferredId >= 0 &&
    preferredId < COMMUNITY_SPAWN_POINTS.length &&
    !occupiedSet.has(preferredId)
  ) {
    return COMMUNITY_SPAWN_POINTS[preferredId];
  }

  // Find center-most available spawn point first (closer to x=0, z=19.5) for pleasant entry
  const sorted = [...COMMUNITY_SPAWN_POINTS].sort((a, b) => {
    const distA = Math.hypot(a.x, a.z - 19.0);
    const distB = Math.hypot(b.x, b.z - 19.0);
    return distA - distB;
  });

  for (const pt of sorted) {
    if (!occupiedSet.has(pt.id)) {
      return pt;
    }
  }

  // Fallback to point 0 if completely filled
  return COMMUNITY_SPAWN_POINTS[0];
}

/**
 * Verifies all 60 spawn points against boundaries and colliders.
 * Returns an array of any points that collide or fall out of bounds.
 */
export function validateSpawnPoints(
  colliders: Collider[],
  bounds: RoomBounds,
  playerRadius: number = 0.35
): {
  validCount: number;
  totalCount: number;
  conflicts: { point: SpawnPoint; reason: string }[];
} {
  const conflicts: { point: SpawnPoint; reason: string }[] = [];

  for (const pt of COMMUNITY_SPAWN_POINTS) {
    // 1. Boundary check
    if (
      pt.x - playerRadius < bounds.minX ||
      pt.x + playerRadius > bounds.maxX ||
      pt.z - playerRadius < bounds.minZ ||
      pt.z + playerRadius > bounds.maxZ
    ) {
      conflicts.push({
        point: pt,
        reason: `Out of room bounds: x=${pt.x}, z=${pt.z}`,
      });
      continue;
    }

    // 2. Obstacle collider collision check
    if (isCollidingWithAny(pt.x, pt.z, playerRadius, colliders)) {
      conflicts.push({
        point: pt,
        reason: `Collides with obstacle at x=${pt.x}, z=${pt.z}`,
      });
    }
  }

  return {
    validCount: COMMUNITY_SPAWN_POINTS.length - conflicts.length,
    totalCount: COMMUNITY_SPAWN_POINTS.length,
    conflicts,
  };
}

