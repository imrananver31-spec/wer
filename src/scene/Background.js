import * as THREE from 'three';

const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uStage;
  varying vec3 vDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 d = normalize(vDir);
    vec3 deep = vec3(0.004, 0.007, 0.012);
    vec3 high = vec3(0.012, 0.032, 0.055);
    vec3 col = mix(deep, high, smoothstep(-0.4, 0.9, d.y));

    // северное сияние: медленные полосы шума над горизонтом
    float t = uTime * 0.025;
    float bands = fbm(vec3(d.x * 2.2 + t, d.y * 5.0 - t * 0.6, d.z * 2.2));
    float curtain = smoothstep(0.45, 0.85, bands) * smoothstep(-0.15, 0.35, d.y) * smoothstep(0.95, 0.4, d.y);
    vec3 aurora = mix(vec3(0.05, 0.22, 0.32), vec3(0.18, 0.38, 0.55), fbm(d * 3.0 + t));
    col += aurora * curtain * (0.35 + 0.25 * sin(uStage * 1.3));

    // редкие холодные звёзды
    vec3 sp = d * 420.0;
    float star = step(0.9975, hash(floor(sp)));
    float tw = 0.6 + 0.4 * sin(uTime * 2.0 + hash(floor(sp) + 3.0) * 40.0);
    col += vec3(0.6, 0.8, 1.0) * star * tw * 0.5 * smoothstep(-0.2, 0.5, d.y);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export class Background {
  constructor() {
    this.uniforms = { uTime: { value: 0 }, uStage: { value: 0 } };
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(80, 48, 32),
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: this.uniforms,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
      })
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
  }

  update(time, stage) {
    this.uniforms.uTime.value = time;
    this.uniforms.uStage.value = stage;
  }
}
