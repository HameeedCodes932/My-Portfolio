export interface FractureShard {
  id: number;
  clipPath: string;
  centerX: number;
  centerY: number;
  flyX: number;
  flyY: number;
  rotate: number;
  rotateX: number;
  rotateY: number;
  scale: number;
  blur: number;
  delay: number;
  duration: number;
}

interface FractureOptions {
  width: number;
  height: number;
  impactX: number;
  impactY: number;
  mobile?: boolean;
  seed?: number;
}

interface Point {
  x: number;
  y: number;
}

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function polarPoint(cx: number, cy: number, radius: number, angle: number): Point {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function polygonCenter(points: Point[]) {
  const total = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 }
  );
  return {
    x: total.x / points.length,
    y: total.y / points.length,
  };
}

function toClipPath(points: Point[], width: number, height: number) {
  return `polygon(${points
    .map((point) => {
      const x = (point.x / width) * 100;
      const y = (point.y / height) * 100;
      return `${x.toFixed(3)}% ${y.toFixed(3)}%`;
    })
    .join(", ")})`;
}

export function createFractureShards({
  width,
  height,
  impactX,
  impactY,
  mobile = false,
  seed = 1937,
}: FractureOptions): FractureShard[] {
  const random = mulberry32(seed);
  const segments = mobile ? 6 : 9;
  const rings = mobile ? [0, 0.42, 0.82, 1.18] : [0, 0.34, 0.7, 1.18];
  const maxRadius =
    Math.max(
      Math.hypot(impactX, impactY),
      Math.hypot(width - impactX, impactY),
      Math.hypot(impactX, height - impactY),
      Math.hypot(width - impactX, height - impactY)
    ) * 1.08;

  const angles = Array.from({ length: segments + 1 }, (_, index) => {
    if (index === 0) return -Math.PI;
    if (index === segments) return Math.PI;
    const base = -Math.PI + (index / segments) * Math.PI * 2;
    return base + (random() - 0.5) * 0.28;
  }).sort((a, b) => a - b);

  const shards: FractureShard[] = [];

  for (let ringIndex = 0; ringIndex < rings.length - 1; ringIndex += 1) {
    for (let segmentIndex = 0; segmentIndex < segments; segmentIndex += 1) {
      const angleA = angles[segmentIndex];
      const angleB = angles[segmentIndex + 1];
      const innerRadius = rings[ringIndex] * maxRadius;
      const outerRadius =
        rings[ringIndex + 1] * maxRadius * (0.95 + random() * 0.16);
      const innerA =
        innerRadius === 0
          ? { x: impactX, y: impactY }
          : polarPoint(
              impactX,
              impactY,
              innerRadius * (0.94 + random() * 0.12),
              angleA + (random() - 0.5) * 0.08
            );
      const innerB =
        innerRadius === 0
          ? { x: impactX, y: impactY }
          : polarPoint(
              impactX,
              impactY,
              innerRadius * (0.94 + random() * 0.12),
              angleB + (random() - 0.5) * 0.08
            );
      const outerB = polarPoint(
        impactX,
        impactY,
        outerRadius,
        angleB + (random() - 0.5) * 0.1
      );
      const outerA = polarPoint(
        impactX,
        impactY,
        outerRadius,
        angleA + (random() - 0.5) * 0.1
      );

      const points =
        innerRadius === 0 ? [innerA, outerB, outerA] : [innerA, innerB, outerB, outerA];
      const center = polygonCenter(points);
      const dx = center.x - impactX;
      const dy = center.y - impactY;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const distanceNorm = Math.min(1, distance / maxRadius);
      const directionX = dx / distance;
      const directionY = dy / distance;
      const blast = (mobile ? 360 : 560) + random() * (mobile ? 280 : 520);
      const nearBoost = 1.25 - distanceNorm * 0.22;
      const towardCamera = 1 + random() * (mobile ? 0.45 : 0.85);

      shards.push({
        id: shards.length,
        clipPath: toClipPath(points, width, height),
        centerX: center.x,
        centerY: center.y,
        flyX: directionX * blast * nearBoost + (random() - 0.5) * 130,
        flyY: directionY * blast * nearBoost + (random() - 0.5) * 150,
        rotate: (random() - 0.5) * (mobile ? 38 : 74),
        rotateX: (random() - 0.5) * (mobile ? 24 : 58),
        rotateY: (random() - 0.5) * (mobile ? 26 : 66),
        scale: towardCamera,
        blur: random() * (mobile ? 1.4 : 2.8),
        delay: distanceNorm * (mobile ? 0.16 : 0.24) + random() * 0.045,
        duration: (mobile ? 0.86 : 1.18) + random() * (mobile ? 0.3 : 0.5),
      });
    }
  }

  return shards;
}