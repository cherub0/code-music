import type { PositionedNote } from '../score/layout';
export type NotationRecord = { noteId: string; head: { position: [number,number,number]; scale: number }; stem: { position: [number,number,number]; height: number; direction: -1|1 }; ledgerYs: number[]; activeEnergy: number };
export function notationForNote(note: PositionedNote, time: number): NotationRecord {
  const direction: -1|1 = note.pitch >= 71 ? -1 : 1;
  const height = 0.72; const ledgerYs: number[] = [];
  const min = -0.68, max = 0.68;
  if (note.position.y < min) for (let y=min-0.17; y>=note.position.y; y-=0.17) ledgerYs.push(y);
  if (note.position.y > max) for (let y=max+0.17; y<=note.position.y; y+=0.17) ledgerYs.push(y);
  const end = note.startSeconds + note.durationSeconds;
  const activeEnergy = time >= note.startSeconds && time <= end ? note.glow : time > end && time < end+0.45 ? note.glow*(1-(time-end)/0.45) : 0;
  return { noteId: note.id, head: { position: [0,note.position.y,note.position.z], scale: 0.16 }, stem: { position: [direction*0.13,note.position.y+direction*height/2,note.position.z], height, direction }, ledgerYs, activeEnergy };
}
