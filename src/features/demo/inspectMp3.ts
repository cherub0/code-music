export type Mp3Inspection = {
  durationSeconds: number;
  frameCount: number;
  sampleRate: number;
};

type Frame = {
  byteLength: number;
  sampleRate: number;
  samples: number;
};

const MPEG1_LAYER3_KBPS = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
];
const MPEG2_LAYER3_KBPS = [
  0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160,
];
const MPEG1_SAMPLE_RATES = [44_100, 48_000, 32_000];

function id3v2Length(bytes: Uint8Array): number {
  if (
    bytes.length < 10 ||
    bytes[0] !== 0x49 ||
    bytes[1] !== 0x44 ||
    bytes[2] !== 0x33
  ) return 0;

  const size =
    (bytes[6] << 21) |
    (bytes[7] << 14) |
    (bytes[8] << 7) |
    bytes[9];
  const hasFooter = (bytes[5] & 0x10) !== 0;
  return 10 + size + (hasFooter ? 10 : 0);
}

function frameAt(bytes: Uint8Array, offset: number): Frame | null {
  if (offset + 4 > bytes.length) return null;
  const first = bytes[offset];
  const second = bytes[offset + 1];
  const third = bytes[offset + 2];
  if (first !== 0xff || (second & 0xe0) !== 0xe0) return null;

  const versionBits = (second >> 3) & 0x03;
  const layerBits = (second >> 1) & 0x03;
  const bitrateIndex = (third >> 4) & 0x0f;
  const sampleRateIndex = (third >> 2) & 0x03;
  const padding = (third >> 1) & 0x01;
  if (
    versionBits === 0x01 ||
    layerBits !== 0x01 ||
    bitrateIndex === 0 ||
    bitrateIndex === 0x0f ||
    sampleRateIndex === 0x03
  ) return null;

  const isMpeg1 = versionBits === 0x03;
  const divisor = versionBits === 0x02 ? 2 : versionBits === 0x00 ? 4 : 1;
  const sampleRate = MPEG1_SAMPLE_RATES[sampleRateIndex] / divisor;
  const bitrate = (isMpeg1 ? MPEG1_LAYER3_KBPS : MPEG2_LAYER3_KBPS)[bitrateIndex];
  const samples = isMpeg1 ? 1_152 : 576;
  const byteLength = Math.floor(
    ((isMpeg1 ? 144 : 72) * bitrate * 1_000) / sampleRate + padding,
  );
  if (byteLength < 4 || offset + byteLength > bytes.length) return null;
  return { byteLength, sampleRate, samples };
}

export function inspectMp3(bytes: Uint8Array): Mp3Inspection {
  if (bytes.length === 0) throw new Error('MP3 file is empty.');

  let offset = id3v2Length(bytes);
  let firstFrame: Frame | null = null;
  while (offset + 4 <= bytes.length) {
    const candidate = frameAt(bytes, offset);
    if (candidate && frameAt(bytes, offset + candidate.byteLength)) {
      firstFrame = candidate;
      break;
    }
    offset += 1;
  }
  if (!firstFrame) throw new Error('No decodable MPEG Layer III audio frames found.');

  let frame: Frame | null = firstFrame;
  let frameCount = 0;
  let sampleCount = 0;
  const sampleRate = firstFrame.sampleRate;
  while (frame && frame.sampleRate === sampleRate) {
    frameCount += 1;
    sampleCount += frame.samples;
    offset += frame.byteLength;
    frame = frameAt(bytes, offset);
  }

  return {
    durationSeconds: sampleCount / sampleRate,
    frameCount,
    sampleRate,
  };
}
