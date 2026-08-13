import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Vector3 } from 'three';
import type { DirectorState } from '../performance/director';

export function DirectorCamera({ state }: { state: DirectorState['camera'] }) {
  useFrame(({ camera }) => {
    camera.position.set(...state.position);
    camera.lookAt(new Vector3(...state.target));
    if (camera instanceof PerspectiveCamera && camera.fov !== state.fov) {
      camera.fov = state.fov;
      camera.updateProjectionMatrix();
    }
    camera.userData.focusDistance = state.focusDistance;
    camera.userData.directorPose = [...state.position, ...state.target, state.fov].map(value => Number(value.toFixed(5))).join(',');
  });
  return null;
}
