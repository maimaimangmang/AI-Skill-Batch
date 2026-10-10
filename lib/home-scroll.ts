// Keep both copies aligned at the loop boundary, in either scroll direction.
export function skillStreamOffset(distance: number, cycleHeight: number, direction: 1 | -1): number {
  if (cycleHeight <= 0) return 0;
  const progress = ((distance * direction) % cycleHeight + cycleHeight) % cycleHeight;
  return -progress;
}
