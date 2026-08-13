import { InstancedBufferAttribute, type InstancedMesh, type Material } from 'three';

export function ensureInstanceColors(mesh: InstancedMesh, capacity: number): void {
  if (mesh.instanceColor) return;
  mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(Math.max(1, capacity) * 3), 3);
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((material: Material) => { material.needsUpdate = true; });
}
