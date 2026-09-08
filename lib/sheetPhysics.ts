/** Exponential decay projection from Apple's Designing Fluid Interfaces. */
export function project(velocityPxPerSec: number, decelerationRate = 0.998) {
  'worklet';
  return (velocityPxPerSec / 1000) * decelerationRate / (1 - decelerationRate);
}

export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  'worklet';
  if (dimension <= 0) return 0;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
