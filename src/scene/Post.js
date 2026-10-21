import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Финальный проход: хроматическая аберрация от скорости скролла,
// лёгкая линзовая дисторсия, плёночное зерно и виньетка.
const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberration: { value: 0 },
    uDim: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAberration;
    uniform float uDim;
    uniform vec2 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec2 uv = 0.5 + c * (1.0 - r2 * 0.06);
      vec2 dir = c * (0.0012 + uAberration);

      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir).b;

      float vig = smoothstep(0.85, 0.2, r2 * 1.6);
      col *= mix(0.55, 1.0, vig) * (1.0 - uDim);

      float g = hash(vUv * uResolution + fract(uTime * 13.7) * 100.0) - 0.5;
      col += g * 0.045;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class Post {
  constructor(renderer, scene, camera, { bloom = true } = {}) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.5, 0.92);
    this.bloom.enabled = bloom;
    this.composer.addPass(this.bloom);

    this.composer.addPass(new OutputPass());

    this.final = new ShaderPass(FinalShader);
    this.composer.addPass(this.final);
  }

  setSize(w, h, pr) {
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w * pr, h * pr);
    this.final.uniforms.uResolution.value.set(w * pr, h * pr);
  }

  render(time, aberration, dim = 0) {
    this.final.uniforms.uDim.value = dim;
    this.final.uniforms.uTime.value = time;
    this.final.uniforms.uAberration.value = aberration;
    this.composer.render();
  }
}
