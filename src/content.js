// Всё, что видно на сайте, правится здесь.
// Значения ниже — заглушки: замени их на свои проекты и контакты.

export const profile = {
  name: 'Семён',
  role: 'Веб-разработчик',
  tagline:
    'Делаю интерфейсы, которые хочется трогать: от быстрых лендингов до сложных SPA с WebGL и живой графикой.',
  city: 'Москва',
  timeZone: 'Europe/Moscow',
  status: 'Открыт к проектам',
  about: [
    'Я веб-разработчик. Пишу фронтенд и бэкенд, но больше всего люблю момент, когда интерфейс начинает отзываться на каждое движение.',
    'Работаю с TypeScript, React и Node.js, а для графики использую Three.js и GLSL. Слежу за производительностью: 60 кадров в секунду для меня такое же требование, как рабочая кнопка «Отправить».',
  ],
  facts: [
    { value: '5+', label: 'лет пишу код' },
    { value: '40+', label: 'проектов в продакшене' },
    { value: '60', label: 'fps как стандарт' },
  ],
};

export const projects = [
  {
    title: 'Nordlicht',
    year: '2026',
    kind: '3D-витрина магазина',
    stack: ['Three.js', 'GLSL', 'Next.js'],
    text: 'Интерактивный каталог, где товар можно покрутить в браузере. Свои шейдеры стекла и металла, загрузка моделей по требованию.',
    url: '#',
  },
  {
    title: 'Pulse CRM',
    year: '2025',
    kind: 'SaaS для отдела продаж',
    stack: ['React', 'TypeScript', 'Node.js'],
    text: 'Воронка сделок в реальном времени, канбан на тысячи карточек без лагов, отчёты с графиками.',
    url: '#',
  },
  {
    title: 'Frostbyte',
    year: '2025',
    kind: 'Браузерная игра',
    stack: ['WebGL', 'Rapier', 'Vite'],
    text: 'Аркада про ледяной лабиринт: физика, процедурные уровни и таблица рекордов.',
    url: '#',
  },
  {
    title: 'Atlas API',
    year: '2024',
    kind: 'Бэкенд для логистики',
    stack: ['NestJS', 'PostgreSQL', 'Docker'],
    text: 'API для расчёта маршрутов и трекинга грузов. 2 млн запросов в сутки, p95 меньше 80 мс.',
    url: '#',
  },
];

export const stack = [
  {
    group: 'Frontend',
    items: ['TypeScript', 'React', 'Next.js', 'Vue', 'Three.js', 'GLSL', 'GSAP'],
  },
  {
    group: 'Backend',
    items: ['Node.js', 'NestJS', 'PostgreSQL', 'Redis', 'REST', 'GraphQL'],
  },
  {
    group: 'Инструменты',
    items: ['Git', 'Docker', 'Vite', 'Figma', 'CI/CD', 'Linux'],
  },
];

export const contacts = {
  email: 'hello@semyon.dev',
  links: [
    { label: 'Telegram', handle: '@username', url: 'https://t.me/username' },
    { label: 'GitHub', handle: 'imrananver31-spec', url: 'https://github.com/imrananver31-spec' },
    { label: 'LinkedIn', handle: 'semyon', url: 'https://linkedin.com/in/username' },
  ],
};
