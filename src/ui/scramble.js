const GLYPHS = '!<>-_\\/[]{}=+*^?#01АБВЖЗЯ';

// Текст «декодируется» из случайных символов, как вывод в терминале.
export function scramble(el, { duration = 1400, delay = 0 } = {}) {
  const target = el.dataset.text ?? el.textContent;
  el.dataset.text = target;
  const len = target.length;
  const start = performance.now() + delay;

  return new Promise((resolve) => {
    function frame(now) {
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      let out = '';
      for (let i = 0; i < len; i++) {
        const reveal = i / len;
        if (target[i] === ' ' || t > reveal * 0.7 + 0.3) out += target[i];
        else if (t > reveal * 0.7) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        else out += ' ';
      }
      el.textContent = out;
      if (t < 1) requestAnimationFrame(frame);
      else {
        el.textContent = target;
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}
