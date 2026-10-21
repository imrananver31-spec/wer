import Lenis from 'lenis';
import './style.css';
import { profile } from './content.js';
import { render } from './ui/render.js';
import { scramble } from './ui/scramble.js';

document.documentElement.classList.add('js');
render();

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
const pad3 = (n) => String(Math.round(n)).padStart(3, '0');

/* ---------- smooth scroll ---------- */

const lenis = new Lenis({
  duration: reducedMotion ? 0 : 1.25,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: !reducedMotion,
});
lenis.stop();
window.scrollTo(0, 0);

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { duration: 2.2 });
  });
});

/* ---------- секции → стадия сцены ---------- */

const sections = [...document.querySelectorAll('[data-stage]')];
const navLinks = [...document.querySelectorAll('.nav a')];
let anchors = [];

function measure() {
  // стадия i достигается, когда секция i стоит по центру экрана
  anchors = sections.map((s, i) => {
    if (i === 0) return 0;
    const top = s.getBoundingClientRect().top + window.scrollY;
    const center = top + s.offsetHeight / 2 - window.innerHeight / 2;
    return Math.min(center, document.documentElement.scrollHeight - window.innerHeight);
  });
}

function stageAt(y) {
  if (y <= anchors[0]) return 0;
  for (let i = 0; i < anchors.length - 1; i++) {
    if (y < anchors[i + 1]) return i + (y - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i]);
  }
  return anchors.length - 1;
}

/* ---------- reveal + scramble ---------- */

const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    }
  },
  { rootMargin: '0px 0px -12% 0px' }
);

function armReveals() {
  document.querySelectorAll('.reveal, .h2, .about__head').forEach((el) => {
    if (!el.closest('.hero')) io.observe(el);
  });
}

/* ---------- loader + intro ---------- */

function runLoader(prepare) {
  const num = $('loader-num');
  const bar = $('loader-bar');
  const start = performance.now();
  const min = reducedMotion ? 300 : 1500;
  let ready = false;

  // даём кадру отрисоваться, потом компилируем шейдеры
  requestAnimationFrame(() =>
    setTimeout(() => {
      try {
        prepare();
      } finally {
        ready = true;
      }
    }, 30)
  );

  return new Promise((resolve) => {
    function tick(now) {
      const t = Math.min(1, (now - start) / min);
      const p = ready ? t : Math.min(t, 0.86);
      const eased = 1 - Math.pow(1 - p, 3);
      num.textContent = pad3(eased * 100);
      bar.style.transform = `scaleX(${eased})`;
      if (p >= 1) resolve();
      else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

function playIntro() {
  $('loader').classList.add('is-done');
  const hero = $('hero');
  setTimeout(() => {
    hero.querySelectorAll('.line-mask').forEach((el) => el.classList.add('is-in'));
    hero.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
    const name = hero.querySelector('[data-scramble]');
    if (name && !reducedMotion) scramble(name, { duration: 1600, delay: 250 });
    scramble($('logo-mark'), { duration: 1200, delay: 600 });
  }, 250);
  lenis.start();
}

/* ---------- курсор ---------- */

const cursor = $('cursor');
const cur = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
window.addEventListener('pointermove', (e) => {
  cur.tx = e.clientX;
  cur.ty = e.clientY;
  cursor.classList.add('is-ready');
});
window.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
window.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
document.addEventListener('pointerover', (e) => {
  cursor.classList.toggle('is-hover', !!e.target.closest('[data-hover]'));
});
document.documentElement.addEventListener('pointerleave', () => cursor.classList.remove('is-ready'));

/* ---------- часы ---------- */

const clockFmt = new Intl.DateTimeFormat('ru-RU', {
  timeZone: profile.timeZone,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
const tickClock = () => ($('clock').textContent = clockFmt.format(new Date()));
tickClock();
setInterval(tickClock, 1000);

/* ---------- копирование почты ---------- */

const email = $('email');
email.addEventListener('click', async () => {
  const hint = $('email-hint');
  try {
    await navigator.clipboard.writeText(email.dataset.email);
    hint.textContent = 'Скопировано';
  } catch {
    const range = document.createRange();
    range.selectNodeContents(email.querySelector('span'));
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    hint.textContent = 'Выделено, жми Ctrl+C';
  }
  setTimeout(() => (hint.textContent = 'Скопировать'), 2200);
});

/* ---------- запуск ---------- */

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

async function boot() {
  measure();
  armReveals();

  let world = null;
  if (hasWebGL()) {
    const { World } = await import('./scene/World.js');
    world = new World($('gl'), { mobile, reducedMotion });
    if (location.search.includes('debug')) window.__world = world;
  } else {
    document.documentElement.classList.add('no-webgl');
  }

  await runLoader(() => world?.compile());
  world?.startIntro();
  playIntro();

  window.addEventListener('pointermove', (e) => world?.pointer(e.clientX, e.clientY, performance.now()));
  window.addEventListener('resize', () => {
    measure();
    world?.resize();
  });
  new ResizeObserver(measure).observe(document.body);

  document.querySelectorAll('[data-project]').forEach((el) => {
    el.addEventListener('pointerenter', () => (hover = 1));
    el.addEventListener('pointerleave', () => (hover = 0));
    el.addEventListener('focus', () => (hover = 1));
    el.addEventListener('blur', () => (hover = 0));
  });

  let hover = 0;
  let last = performance.now();
  let hudTimer = 0;
  const progressNum = $('progress-num');
  const progressBar = $('progress-bar');
  const sectionNum = $('section-num');
  const hudCam = $('hud-cam');
  const hudFps = $('hud-fps');
  let activeSection = -1;

  function frame(now) {
    const dt = (now - last) / 1000;
    last = now;
    lenis.raf(now);

    const y = lenis.scroll;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const stage = stageAt(y);

    if (world) {
      world.stageTarget = stage;
      world.velocity = lenis.velocity * 0.1;
      world.energy = hover;
      world.update(dt, now);
    }

    cur.x += (cur.tx - cur.x) * 0.2;
    cur.y += (cur.ty - cur.y) * 0.2;
    cursor.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;

    const p = y / max;
    progressBar.style.transform = `scaleX(${p})`;

    hudTimer += dt;
    if (hudTimer > 0.12) {
      hudTimer = 0;
      progressNum.textContent = pad3(p * 100);
      if (world) {
        const c = world.camera.position;
        hudCam.textContent = `cam ${c.x.toFixed(2)} ${c.y.toFixed(2)} ${c.z.toFixed(2)}`;
        hudFps.textContent = `${Math.round(world.fps)} fps`;
      }
    }

    const idx = Math.min(sections.length - 1, Math.round(stage));
    if (idx !== activeSection) {
      activeSection = idx;
      sectionNum.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(sections.length).padStart(2, '0')}`;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${sections[idx].id}`));
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot();
