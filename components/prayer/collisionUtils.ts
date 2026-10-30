export interface RoomBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface BoxCollider {
  type: 'box';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  id?: string;
  name?: string;
}

export interface CylinderCollider {
  type: 'cylinder';
  x: number;
  z: number;
  radius: number;
  id?: string;
  name?: string;
}

export type Collider = BoxCollider | CylinderCollider;

/**
 * Checks if a circle of given radius at (px, pz) collides with a single collider.
 */
export function checkCircleColliderCollision(
  px: number,
  pz: number,
  radius: number,
  collider: Collider
): boolean {
  if (collider.type === 'box') {
    // Find closest point on the AABB box to circle center
    const closestX = Math.max(collider.minX, Math.min(px, collider.maxX));
    const closestZ = Math.max(collider.minZ, Math.min(pz, collider.maxZ));
    const dx = px - closestX;
    const dz = pz - closestZ;
    return dx * dx + dz * dz < radius * radius;
  }

  if (collider.type === 'cylinder') {
    const dx = px - collider.x;
    const dz = pz - collider.z;
    const totalRadius = radius + collider.radius;
    return dx * dx + dz * dz < totalRadius * totalRadius;
  }

  return false;
}

/**
 * Checks if a circle at (px, pz) collides with ANY collider in the list.
 */
export function isCollidingWithAny(
  px: number,
  pz: number,
  radius: number,
  colliders: Collider[]
): boolean {
  for (let i = 0; i < colliders.length; i++) {
    if (checkCircleColliderCollision(px, pz, radius, colliders[i])) {
      return true;
    }
  }
  return false;
}

/**
 * Resolves movement with independent axis collision (wall sliding),
 * room boundary clamping, and cylinder radial push-out.
 *
 * This allows the player to slide smoothly along walls, pews, and pillars
 * without getting stuck on diagonal input.
 */
export function resolveSlidingMovement(
  currentPos: { x: number; z: number },
  desiredDelta: { x: number; z: number },
  bounds: RoomBounds,
  colliders: Collider[],
  playerRadius: number = 0.35
): { x: number; z: number } {
  let currX = currentPos.x;
  let currZ = currentPos.z;

  // 1. Try X movement alone
  if (Math.abs(desiredDelta.x) > 1e-5) {
    const nextX = Math.max(
      bounds.minX + playerRadius,
      Math.min(bounds.maxX - playerRadius, currX + desiredDelta.x)
    );
    // Only accept if within bounds and not colliding with any obstacle
    if (!isCollidingWithAny(nextX, currZ, playerRadius, colliders)) {
      currX = nextX;
    }
  }

  // 2. Try Z movement alone
  if (Math.abs(desiredDelta.z) > 1e-5) {
    const nextZ = Math.max(
      bounds.minZ + playerRadius,
      Math.min(bounds.maxZ - playerRadius, currZ + desiredDelta.z)
    );
    // Only accept if within bounds and not colliding with any obstacle
    if (!isCollidingWithAny(currX, nextZ, playerRadius, colliders)) {
      currZ = nextZ;
    }
  }

  // 3. Smooth cylinder deflection / push-out if slightly overlapping
  for (let i = 0; i < colliders.length; i++) {
    const col = colliders[i];
    if (col.type === 'cylinder') {
      const dx = currX - col.x;
      const dz = currZ - col.z;
      const distSq = dx * dx + dz * dz;
      const minDist = playerRadius + col.radius;
      if (distSq < minDist * minDist && distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        const overlap = minDist - dist;
        const pushX = (dx / dist) * overlap;
        const pushZ = (dz / dist) * overlap;

        const candidateX = Math.max(
          bounds.minX + playerRadius,
          Math.min(bounds.maxX - playerRadius, currX + pushX)
        );
        const candidateZ = Math.max(
          bounds.minZ + playerRadius,
          Math.min(bounds.maxZ - playerRadius, currZ + pushZ)
        );

        currX = candidateX;
        currZ = candidateZ;
      }
    }
  }

  // 4. Final safety clamp within room bounds
  currX = Math.max(
    bounds.minX + playerRadius,
    Math.min(bounds.maxX - playerRadius, currX)
  );
  currZ = Math.max(
    bounds.minZ + playerRadius,
    Math.min(bounds.maxZ - playerRadius, currZ)
  );

  return { x: currX, z: currZ };
}

