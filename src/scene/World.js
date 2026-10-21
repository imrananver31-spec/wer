import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Background } from './Background.js';
import { Crystal } from './Crystal.js';
import { Shards } from './Shards.js';
import { Snow } from './Snow.js';
import { Post } from './Post.js';

const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

// Ключевые кадры камеры и кристалла — по одному на секцию.
const KEYS = [
  { pos: [0, 0.1, 6.2], look: [-1.9, -0.55, 0], crystal: 1, bloom: 0.55, dim: 0 },
  { pos: [-0.4, 0.5, 6.4], look: [1.9, 0, 0], crystal: 0.42, bloom: 0.6, dim: 0.3 },
  { pos: [0.6, 1.3, 10.5], look: [-1.0, 0.2, 0], crystal: 0, bloom: 0.55, dim: 0.5 },
  { pos: [0, 2.7, 6.4], look: [0, -1.5, -1.2], crystal: 0, bloom: 0.45, dim: 0.42 },
  { pos: [0, 0.2, 8.2], look: [-2.3, -1.3, 0], crystal: 0.7, bloom: 0.65, dim: 0.12 },
];

function sampleKeys(stage) {
  const k = Math.min(Math.floor(stage), KEYS.length - 2);
  const t = smooth(Math.min(1, Math.max(0, stage - k)));
  const a = KEYS[k];
  const b = KEYS[k + 1];
  return {
    pos: a.pos.map((v, i) => lerp(v, b.pos[i], t)),
    look: a.look.map((v, i) => lerp(v, b.look[i], t)),
    crystal: lerp(a.crystal, b.crystal, t),
    bloom: lerp(a.bloom, b.bloom, t),
    dim: lerp(a.dim, b.dim, t),
  };
}

export class World {
  constructor(canvas, { mobile = false, reducedMotion = false } = {}) {
    this.mobile = mobile;
    this.reducedMotion = reducedMotion;
    this.maxPR = mobile ? 1.5 : 2;
    this.pr = Math.min(window.devicePixelRatio || 1, this.maxPR);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(this.pr);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor('#05080d');

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2('#05080d', 0.05);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(this.renderer), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(mobile ? 50 : 38, 1, 0.1, 200);
    this.camera.position.set(0, 0.1, 9);
    this.lookAt = new THREE.Vector3();

    const key = new THREE.DirectionalLight('#d8ecff', 1.6);
    key.position.set(4, 6, 5);
    const rim = new THREE.DirectionalLight('#3d9bff', 2.4);
    rim.position.set(-6, -2, -4);
    this.scene.add(key, rim, new THREE.AmbientLight('#4b6e8f', 0.25));

    this.background = new Background();
    this.scene.add(this.background.mesh);

    this.crystal = new Crystal();
    this.scene.add(this.crystal.group);

    this.shards = new Shards(mobile ? { cols: 42, rows: 22 } : { cols: 64, rows: 30 });
    this.scene.add(this.shards.mesh);

    this.snow = new Snow(mobile ? 900 : 2200, this.pr);
    this.scene.add(this.snow.points);

    this.post = new Post(this.renderer, this.scene, this.camera);

    // ввод
    this.mouse = new THREE.Vector2();
    this.mouseTarget = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1.6);
    this.ground = new THREE.Vector3(0, -1.6, 0);
    this.groundTarget = new THREE.Vector3(0, -1.6, 0);
    this.groundActive = 0;
    this.lastPointer = -10;

    this.stage = 0;
    this.stageTarget = 0;
    this.velocity = 0;
    this.energy = 0;
    this.intro = 0;
    this.introStarted = false;
    this.time = 0;

    this.fps = 60;
    this.slowFrames = 0;

    this.resize();
  }

  compile() {
    // прогреваем шейдеры, чтобы не было рывка на первом кадре
    this.renderer.compile(this.scene, this.camera);
    this.post.render(0, 0);
  }

  pointer(x, y, now) {
    this.mouseTarget.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    this.lastPointer = now;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    // на узких экранах отодвигаем камеру, чтобы сцена влезла
    this.fit = w / h < 1 ? Math.min(1.6, 1 / (w / h) * 0.75) : 1;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h, this.pr);
  }

  startIntro() {
    this.introStarted = true;
  }

  update(dt, now) {
    dt = Math.min(dt, 1 / 20);
    const motion = this.reducedMotion ? 0.25 : 1;
    this.time += dt * motion;
    const time = this.time;

    if (this.introStarted) this.intro = Math.min(1, this.intro + dt / 2.6);
    const intro = 1 - Math.pow(1 - this.intro, 4);

    this.stage += (this.stageTarget - this.stage) * Math.min(1, dt * 5);
    this.mouse.lerp(this.mouseTarget, Math.min(1, dt * 3));

    const k = sampleKeys(this.stage);
    const cam = this.camera;
    cam.position.set(
      k.pos[0] + this.mouse.x * 0.45,
      k.pos[1] + this.mouse.y * 0.28,
      k.pos[2] * this.fit + (1 - intro) * 3.5
    );
    this.lookAt.set(k.look[0] * (this.fit > 1 ? 0.3 : 1), k.look[1], k.look[2]);
    cam.lookAt(this.lookAt);
    cam.rotateZ(-this.mouse.x * 0.02 + Math.sin(time * 0.2) * 0.008);

    // точка курсора на «земле» для поля шипов
    if (now - this.lastPointer < 2500) {
      this.raycaster.setFromCamera(this.mouse, cam);
      if (this.raycaster.ray.intersectPlane(this.groundPlane, this.groundTarget)) {
        this.groundActive += (1 - this.groundActive) * Math.min(1, dt * 3);
      }
    } else {
      // без мыши (телефон) волна гуляет сама
      this.groundTarget.set(Math.sin(time * 0.5) * 5, -1.6, Math.cos(time * 0.37) * 3 - 1);
      this.groundActive += (0.8 - this.groundActive) * Math.min(1, dt);
    }
    this.ground.lerp(this.groundTarget, Math.min(1, dt * 6));

    this.background.mesh.position.copy(cam.position);
    this.background.update(time, this.stage);

    const crystalVis = k.crystal * intro;
    this.crystal.update(time, dt, { visibility: crystalVis, mouse: this.mouse, energy: this.energy });

    this.shards.update(time, dt, this.stage, {
      ground: this.ground,
      groundActive: this.groundActive,
      energy: this.energy,
      velocity: this.velocity * motion,
    });
    this.shards.mesh.visible = this.stage > 0.02;

    this.snow.update(time, dt, this.velocity * motion);

    this.post.bloom.strength = k.bloom + this.energy * 0.35;
    const ab = Math.min(Math.abs(this.velocity) * 0.0035, 0.012) * motion + (1 - intro) * 0.01;
    this.post.render(time, ab, Math.min(0.7, k.dim + (this.mobile && this.stage > 0.5 ? 0.15 : 0)));

    this.adapt(dt);
  }

  // если кадров мало — снижаем плотность пикселей
  adapt(dt) {
    this.fps = lerp(this.fps, 1 / Math.max(dt, 1e-3), 0.05);
    if (this.intro < 1) return;
    if (this.fps < 42 && this.pr > 1) {
      if (++this.slowFrames > 90) {
        this.pr = Math.max(1, this.pr - 0.25);
        this.renderer.setPixelRatio(this.pr);
        this.resize();
        this.slowFrames = 0;
      }
    } else this.slowFrames = 0;
  }
}
