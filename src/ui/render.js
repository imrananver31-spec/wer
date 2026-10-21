import { profile, projects, stack, contacts } from '../content.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const pad = (n) => String(n).padStart(2, '0');

function hero() {
  return `
    <div class="hero__top mono">
      <span class="status reveal" style="--d:2">${esc(profile.status)}</span>
      <span class="reveal" style="--d:3">Портфолио · ${new Date().getFullYear()}</span>
    </div>
    <h1 class="hero__name" aria-label="${esc(profile.name)}">
      <span class="line-mask"><span data-scramble>${esc(profile.name.toUpperCase())}</span></span>
    </h1>
    <div class="hero__row">
      <div class="reveal" style="--d:4">
        <div class="hero__role">${esc(profile.role)}</div>
        <p class="hero__tagline">${esc(profile.tagline)}</p>
      </div>
      <a class="scroll-hint mono reveal" style="--d:5" href="#about" data-hover><i></i>Листай вниз</a>
    </div>`;
}

function about() {
  return `
    <div class="about__grid">
      <div class="about__head">
        <div class="label reveal">Обо мне</div>
        <h2 class="h2">
          <span class="line-mask"><span>Код,</span></span>
          <span class="line-mask" style="--d:1"><span>который</span></span>
          <span class="line-mask" style="--d:2"><span>движется</span></span>
        </h2>
      </div>
      <div class="about__body">
        ${profile.about.map((p, i) => `<p class="reveal" style="--d:${i + 2}">${esc(p)}</p>`).join('')}
        <div class="facts reveal" style="--d:4">
          ${profile.facts
            .map((f) => `<div class="fact"><b>${esc(f.value)}</b><span>${esc(f.label)}</span></div>`)
            .join('')}
        </div>
      </div>
    </div>`;
}

function work() {
  return `
    <div class="work__head">
      <div>
        <div class="label reveal">Избранные проекты</div>
        <h2 class="h2"><span class="line-mask"><span>Работы</span></span></h2>
      </div>
      <div class="work__count mono reveal">${pad(projects.length)} проекта · ${esc(projects.at(-1).year)}–${esc(projects[0].year)}</div>
    </div>
    <ul class="projects">
      ${projects
        .map(
          (p, i) => `
        <li class="project reveal" style="--d:${i}">
          <a href="${esc(p.url)}" data-hover data-project="${i}" target="_blank" rel="noopener">
            <span class="project__year">${esc(p.year)}</span>
            <span class="project__title">${esc(p.title)}</span>
            <span class="project__meta">
              <span class="project__kind">${esc(p.kind)}</span>
              <span class="project__stack">${p.stack.map((s) => `<span>${esc(s)}</span>`).join('')}</span>
              <span class="project__text">${esc(p.text)}</span>
            </span>
            <span class="project__arrow" aria-hidden="true">↗</span>
          </a>
        </li>`
        )
        .join('')}
    </ul>`;
}

function stackSection() {
  let n = 0;
  return `
    <div class="label reveal">Технологии</div>
    <h2 class="h2">
      <span class="line-mask"><span>Чем я</span></span>
      <span class="line-mask" style="--d:1"><span>работаю</span></span>
    </h2>
    <div class="stack__grid">
      ${stack
        .map(
          (g, gi) => `
        <div class="stack__group reveal" style="--d:${gi + 1}">
          <h3>${esc(g.group)}</h3>
          <ul>${g.items.map((it) => `<li><span>${pad(++n)}</span>${esc(it)}</li>`).join('')}</ul>
        </div>`
        )
        .join('')}
    </div>`;
}

function contact() {
  return `
    <div class="label reveal">Контакт</div>
    <h2 class="h2">
      <span class="line-mask"><span>Есть идея?</span></span>
      <span class="line-mask" style="--d:1"><span>Давай соберём.</span></span>
    </h2>
    <div class="reveal" style="--d:2">
      <button class="email" type="button" id="email" data-hover data-email="${esc(contacts.email)}">
        <span>${esc(contacts.email)}</span><small id="email-hint">Скопировать</small>
      </button>
    </div>
    <div class="links reveal" style="--d:3">
      ${contacts.links
        .map(
          (l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener" data-hover><span>${esc(l.label)}</span><span>${esc(l.handle)}</span></a>`
        )
        .join('')}
    </div>
    <div class="copyright mono">© ${new Date().getFullYear()} ${esc(profile.name)} · Three.js · GLSL</div>`;
}

export function render() {
  document.getElementById('hero').innerHTML = hero();
  document.getElementById('about').innerHTML = about();
  document.getElementById('work').innerHTML = work();
  document.getElementById('stack').innerHTML = stackSection();
  document.getElementById('contact').innerHTML = contact();
  document.getElementById('city').textContent = profile.city;
}
