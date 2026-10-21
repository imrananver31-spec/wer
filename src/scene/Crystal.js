import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Один кристалл кварца: шестигранная призма с заострённой верхушкой.
function prism(radius, length, tip) {
  const body = new THREE.CylinderGeometry(radius, radius * 0.92, length, 6, 1, true);
  body.translate(0, length / 2, 0);
  const cap = new THREE.ConeGeometry(radius, tip, 6, 1, true);
  cap.translate(0, length + tip / 2, 0);
  const bottom = new THREE.CircleGeometry(radius * 0.92, 6);
  bottom.rotateX(Math.PI / 2);
  bottom.rotateY(Math.PI / 6);
  const parts = [body, cap, bottom].map((g) => g.toNonIndexed());
  parts.forEach((g) => g.deleteAttribute('uv'));
  return mergeGeometries(parts);
}

function cluster() {
  const parts = [];
  const spec = [
    // [radius, length, tip, tiltX, tiltZ, rotY]
    [0.34, 1.9, 0.55, 0, 0, 0],
    [0.24, 1.3, 0.42, 0.42, 0.18, 0.4],
    [0.22, 1.1, 0.38, -0.36, 0.3, 1.2],
    [0.2, 0.95, 0.34, 0.12, -0.55, 2.1],
    [0.16, 0.7, 0.28, -0.2, -0.75, 2.9],
    [0.18, 0.8, 0.3, 0.7, -0.3, 3.8],
    [0.14, 0.55, 0.24, -0.75, 0.1, 4.6],
    [0.12, 0.5, 0.2, 0.3, 0.85, 5.4],
  ];
  for (const [r, l, t, rx, rz, ry] of spec) {
    const g = prism(r, l, t);
    g.rotateY(ry);
    g.rotateX(rx);
    g.rotateZ(rz);
    parts.push(g);
  }
  const g = mergeGeometries(parts);
  g.computeBoundingBox();
  const c = new THREE.Vector3();
  g.boundingBox.getCenter(c);
  g.translate(-c.x, -c.y, -c.z);
  g.computeVertexNormals();
  return g;
}

export class Crystal {
  constructor() {
    this.group = new THREE.Group();

    this.material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#d6f1ff'),
      roughness: 0.1,
      metalness: 0,
      transmission: 1,
      thickness: 2.2,
      ior: 1.46,
      attenuationColor: new THREE.Color('#2f93d6'),
      attenuationDistance: 1.4,
      iridescence: 0.8,
      iridescenceIOR: 1.35,
      iridescenceThicknessRange: [120, 480],
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      specularIntensity: 1,
      envMapIntensity: 1.6,
      flatShading: true,
    });

    this.mesh = new THREE.Mesh(cluster(), this.material);
    this.mesh.scale.setScalar(1.05);
    this.group.add(this.mesh);

    // светящееся ядро внутри — его ловит bloom через стекло
    this.core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.16, 2),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 4.2, 5.5), toneMapped: false })
    );
    this.group.add(this.core);

    this.light = new THREE.PointLight('#8fd8ff', 6, 6, 1.6);
    this.group.add(this.light);

    this.spin = 0;
  }

  // visibility 0..1 — общий масштаб, energy — пульс ядра
  update(time, dt, { visibility, mouse, energy }) {
    this.spin += dt * (0.12 + energy * 0.8);
    this.mesh.rotation.y = this.spin;
    this.mesh.rotation.x = Math.sin(time * 0.3) * 0.08 + mouse.y * 0.25;
    this.mesh.rotation.z = Math.cos(time * 0.25) * 0.06 - mouse.x * 0.2;

    const s = Math.max(visibility, 0.0001);
    this.group.scale.setScalar(s);
    this.group.position.y = Math.sin(time * 0.8) * 0.06;
    this.group.visible = visibility > 0.002;

    const pulse = 0.85 + Math.sin(time * 2.2) * 0.15 + energy * 0.8;
    this.core.scale.setScalar(pulse);
    this.light.intensity = 5 * pulse * visibility;
  }
}
