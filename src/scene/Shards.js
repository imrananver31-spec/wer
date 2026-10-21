import * as THREE from 'three';

// Осколки льда. Каждый осколок знает своё место в пяти формациях
// (по одной на секцию сайта) и перетекает между ними по скроллу.
//   0 — спрятаны внутри кристалла
//   1 — облако, медленно вращается вокруг кристалла
//   2 — наклонное кольцо, сквозь которое пролетает камера
//   3 — поле ледяных шипов-«эквалайзер», реагирует на курсор
//   4 — сфера-жеода, все осколки смотрят наружу

const UP = new THREE.Vector3(0, 1, 0);
const ALIGN = [0, 0, 0.35, 1, 1];
const TAU = Math.PI * 2;

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

function rand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Shards {
  constructor({ cols, rows }) {
    this.cols = cols;
    this.rows = rows;
    const count = (this.count = cols * rows);
    const r = rand(7);

    const geo = new THREE.OctahedronGeometry(1, 0);
    geo.scale(0.042, 0.15, 0.042);

    this.material = new THREE.MeshPhysicalMaterial({
      color: '#cfe4f2',
      roughness: 0.18,
      metalness: 0.55,
      iridescence: 0.9,
      iridescenceIOR: 1.7,
      iridescenceThicknessRange: [180, 620],
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 0.65,
      flatShading: true,
      emissive: new THREE.Color('#5fc4ff'),
      emissiveIntensity: 0,
    });

    this.mesh = new THREE.InstancedMesh(geo, this.material, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;

    const cA = new THREE.Color('#f2fbff');
    const cB = new THREE.Color('#8fd3ff');
    const cC = new THREE.Color('#3a6f9a');
    const tmpC = new THREE.Color();

    this.seed = new Float32Array(count * 4); // delay, spin speed, orbit speed, scale
    this.dir = new Float32Array(count * 3); // случайное направление
    this.inner = new Float32Array(count * 3);
    this.cloud = new Float32Array(count * 2); // радиус, высота
    this.ring = new Float32Array(count * 3); // угол, радиус, смещение по трубке
    this.sphere = new Float32Array(count * 3);
    this.qBase = [];
    this.spinAxis = [];

    const golden = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < count; i++) {
      this.seed[i * 4] = r() * 0.45;
      this.seed[i * 4 + 1] = (r() - 0.5) * 2.4;
      this.seed[i * 4 + 2] = 0.04 + r() * 0.12;
      this.seed[i * 4 + 3] = 0.5 + Math.pow(r(), 2.2) * 1.2;

      const u = r() * 2 - 1;
      const th = r() * TAU;
      const s = Math.sqrt(1 - u * u);
      const dx = s * Math.cos(th);
      const dy = u;
      const dz = s * Math.sin(th);
      this.dir.set([dx, dy, dz], i * 3);

      const ir = Math.cbrt(r()) * 0.55;
      this.inner.set([dx * ir, dy * ir * 1.4, dz * ir], i * 3);

      this.cloud[i * 2] = 1.3 + Math.pow(r(), 0.9) * 1.9;
      this.cloud[i * 2 + 1] = (r() - 0.5) * 1.6;

      this.ring[i * 3] = (i / count) * TAU + (r() - 0.5) * 0.05;
      this.ring[i * 3 + 1] = 3.4 + (r() + r() + r() - 1.5) * 0.22;
      this.ring[i * 3 + 2] = (r() + r() - 1) * 0.25;

      // точки сферы Фибоначчи
      const y = 1 - (i / (count - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const a = golden * i;
      this.sphere.set([Math.cos(a) * rad, y, Math.sin(a) * rad], i * 3);

      this.qBase.push(new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * TAU, r() * TAU, r() * TAU)));
      this.spinAxis.push(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize());

      const k = r();
      tmpC.copy(k < 0.55 ? cA : k < 0.9 ? cB : cC);
      tmpC.offsetHSL(0, 0, (r() - 0.5) * 0.08);
      this.mesh.setColorAt(i, tmpC);
    }
    this.mesh.instanceColor.needsUpdate = true;

    this.ringTilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.12, 0, 0.32));

    // временные объекты, чтобы не плодить мусор в кадре
    this._pA = new THREE.Vector3();
    this._pB = new THREE.Vector3();
    this._sA = new THREE.Vector3();
    this._sB = new THREE.Vector3();
    this._qA = new THREE.Quaternion();
    this._qB = new THREE.Quaternion();
    this._q = new THREE.Quaternion();
    this._qSpin = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._m = new THREE.Matrix4();
    this._s = new THREE.Vector3();
    this._p = new THREE.Vector3();

    this.energy = 0;
  }

  // Пишет позицию / выравнивание / масштаб осколка i в формации k.
  formation(k, i, time, ctx, pos, q, scl) {
    const base = this.seed[i * 4 + 3];
    const d = this.dir;
    switch (k) {
      case 0: {
        pos.set(this.inner[i * 3], this.inner[i * 3 + 1], this.inner[i * 3 + 2]);
        q.identity();
        scl.setScalar(0.0001);
        break;
      }
      case 1: {
        const radius = this.cloud[i * 2];
        const ang = Math.atan2(d[i * 3 + 2], d[i * 3]) + time * this.seed[i * 4 + 2] * (2.6 / radius);
        const flat = Math.sqrt(1 - d[i * 3 + 1] * d[i * 3 + 1]);
        pos.set(
          Math.cos(ang) * radius * (0.35 + flat * 0.65) - 1.3,
          d[i * 3 + 1] * radius * 0.55 + this.cloud[i * 2 + 1] * 0.4 + Math.sin(time * 0.6 + i) * 0.05,
          Math.sin(ang) * radius * (0.35 + flat * 0.65)
        );
        q.identity();
        scl.setScalar(base);
        break;
      }
      case 2: {
        const ang = this.ring[i * 3] + time * 0.05;
        const R = this.ring[i * 3 + 1];
        const off = this.ring[i * 3 + 2];
        const wob = Math.sin(ang * 6 + time * 0.8) * 0.18;
        pos.set(Math.cos(ang) * (R + off), d[i * 3 + 1] * 0.2 + wob, Math.sin(ang) * (R + off));
        pos.applyQuaternion(this.ringTilt);
        // осколок лежит по касательной к кольцу
        this._v.set(-Math.sin(ang), 0, Math.cos(ang)).applyQuaternion(this.ringTilt);
        q.setFromUnitVectors(UP, this._v);
        scl.setScalar(base * 1.1);
        break;
      }
      case 3: {
        const c = i % this.cols;
        const rr = (i / this.cols) | 0;
        const x = (c / (this.cols - 1) - 0.5) * 17;
        const z = (rr / (this.rows - 1) - 0.5) * 11 - 1.2;
        const w =
          Math.sin(x * 0.55 + time * 1.1) * Math.cos(z * 0.45 - time * 0.7) * 0.5 +
          Math.sin((x + z) * 0.3 - time * 0.5) * 0.35;
        const mx = x - ctx.ground.x;
        const mz = z - ctx.ground.z;
        const ripple = Math.exp(-(mx * mx + mz * mz) * 0.35) * ctx.groundActive;
        const h = 0.35 + (w + 0.85) * 0.75 + ripple * 2.2;
        pos.set(x, -1.75 + h * 0.24, z);
        q.identity();
        scl.set(1.6, h * 1.5, 1.6);
        break;
      }
      default: {
        const R = 2.55 + Math.sin(time * 1.4 + i * 0.37) * 0.05;
        const sx = this.sphere[i * 3];
        const sy = this.sphere[i * 3 + 1];
        const sz = this.sphere[i * 3 + 2];
        const a = time * 0.12;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        this._v.set(sx * ca - sz * sa, sy, sx * sa + sz * ca);
        pos.copy(this._v).multiplyScalar(R);
        q.setFromUnitVectors(UP, this._v);
        scl.setScalar(0.8 + base * 0.4);
        break;
      }
    }
  }

  update(time, dt, stage, ctx) {
    const k = Math.min(Math.floor(stage), 3);
    const t = stage - k;
    const { _pA, _pB, _sA, _sB, _qA, _qB, _q, _qSpin, _m, _s, _p } = this;

    this.energy += (ctx.energy - this.energy) * Math.min(1, dt * 4);
    this.material.emissiveIntensity = this.energy * 0.6;

    for (let i = 0; i < this.count; i++) {
      const delay = this.seed[i * 4];
      const e = easeInOut(clamp01((t - delay) / (1 - 0.45)));

      this.formation(k, i, time, ctx, _pA, _qA, _sA);
      if (e > 0) this.formation(k + 1, i, time, ctx, _pB, _qB, _sB);
      else {
        _pB.copy(_pA);
        _qB.copy(_qA);
        _sB.copy(_sA);
      }

      _p.lerpVectors(_pA, _pB, e);
      // дуга во время перехода — осколки летят не по прямой
      const arc = Math.sin(e * Math.PI) * (0.9 + delay);
      _p.x += this.dir[i * 3] * arc;
      _p.y += this.dir[i * 3 + 1] * arc;
      _p.z += this.dir[i * 3 + 2] * arc;

      _s.lerpVectors(_sA, _sB, e);
      const v = ctx.velocity;
      if (v) _s.y *= 1 + Math.min(Math.abs(v), 3) * 0.12;

      const align = ALIGN[k] + (ALIGN[k + 1] - ALIGN[k]) * e;
      _q.slerpQuaternions(_qA, _qB, e);
      _qSpin.setFromAxisAngle(this.spinAxis[i], time * this.seed[i * 4 + 1] + i);
      _qSpin.premultiply(this.qBase[i]);
      _qSpin.slerp(_q, align);

      _m.compose(_p, _qSpin, _s);
      this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
