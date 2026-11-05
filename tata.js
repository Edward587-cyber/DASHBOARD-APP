// Menandai menu samping sesuai bagian yang sedang terlihat.
(() => {
  const links = Array.from(document.querySelectorAll('.rp-nav a[data-nav]'));
  const set = (id) => links.forEach((a) => a.classList.toggle('on', a.dataset.nav === id));
  const secs = links.map((a) => document.getElementById(a.dataset.nav)).filter(Boolean);
  const onScroll = () => {
    let cur = secs[0] && secs[0].id;
    secs.forEach((s) => { if (s.getBoundingClientRect().top < 140) cur = s.id; });
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4 && secs.length) cur = secs[secs.length - 1].id;
    set(cur);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  links.forEach((a) => a.addEventListener('click', () => set(a.dataset.nav)));
  onScroll();
})();
