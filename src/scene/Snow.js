import * as THREE from 'three';

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSpeed;
  attribute float aSeed;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float fall = uTime * (0.12 + aSeed * 0.18) + uSpeed;
    p.y = mod(p.y - fall + 10.0, 20.0) - 10.0;
    p.x += sin(uTime * 0.3 + aSeed * 30.0) * 0.25;
    p.z += cos(uTime * 0.25 + aSeed * 20.0) * 0.25;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = (0.6 + aSeed * 1.8) * uPixelRatio;
    gl_PointSize = size * (14.0 / -mv.z);
    vAlpha = smoothstep(26.0, 4.0, -mv.z) * smoothstep(0.3, 1.6, -mv.z) * (0.35 + aSeed * 0.65);
  }
`;

const fragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vec3(0.75, 0.9, 1.0) * 1.4, a * a * vAlpha);
  }
`;

export class Snow {
  constructor(count, pixelRatio) {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
      seed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

    this.uniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uSpeed: { value: 0 },
    };
    this.points = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: this.uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.points.frustumCulled = false;
    this.drift = 0;
  }

  update(time, dt, velocity) {
    // при быстром скролле снег «сдувает» вверх-вниз
    this.drift += velocity * dt * 0.6;
    this.uniforms.uTime.value = time;
    this.uniforms.uSpeed.value = this.drift;
  }
}
