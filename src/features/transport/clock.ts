export function logicalTime(audioTime: number, offsetSeconds: number, speed: number): number {
  return Math.max(0, (audioTime - offsetSeconds) * speed);
}
