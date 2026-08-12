import type { PerformanceFrame } from '../performance/frame';

type CodeTerminalProps = {
  frame: PerformanceFrame;
  logicalTime: number;
};

const CODE_LINES = [2.35, 1.65, 2.8, 1.9, 2.5, 1.35, 2.7, 2.05] as const;

export function CodeTerminal({ frame, logicalTime }: CodeTerminalProps) {
  const fractureFade = 1 - frame.fractureProgress;
  const opacity = frame.terminalOpacity * fractureFade;
  const scanY = 1.55 - ((Math.max(0, logicalTime) * 0.72) % 3.1);

  return (
    <group position={[0, 0.2, 0]} rotation={[0.08, -0.12, 0.015]} visible={opacity > 0.002}>
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[7.2, 4.5, 0.12]} />
        <meshStandardMaterial
          color="#061522"
          emissive="#092a37"
          emissiveIntensity={0.8}
          opacity={opacity * 0.82}
          transparent
        />
      </mesh>
      <mesh>
        <boxGeometry args={[7.35, 4.65, 0.08]} />
        <meshBasicMaterial color="#55f6ff" opacity={opacity * 0.55} transparent wireframe />
      </mesh>
      {CODE_LINES.map((width, index) => (
        <mesh key={width + index} position={[-2.75 + width / 2, 1.45 - index * 0.39, 0.04]}>
          <boxGeometry args={[width, 0.065, 0.035]} />
          <meshBasicMaterial
            color={index % 3 === 0 ? '#ff54cf' : '#55f6ff'}
            opacity={opacity * (0.38 + (index % 4) * 0.09)}
            transparent
            toneMapped={false}
          />
        </mesh>
      ))}
      <mesh position={[0, scanY, 0.11]}>
        <boxGeometry args={[6.8, 0.025, 0.018]} />
        <meshBasicMaterial color="#b7ffff" opacity={opacity * 0.85} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}
