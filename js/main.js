/* ============================================================
   main.js — dựng dự án / tin tức / dịch vụ từ content/*.json
   Ngài không cần sửa file này.
   ============================================================ */
const CATEGORIES = [
  ['all', 'Tất cả'], ['fnb', 'F&B'], ['beauty', 'Beauty'], ['technology', 'Technology'],
  ['wedding', 'Wedding'], ['fashion', 'Fashion'], ['education', 'Education'],
  ['retail', 'Retail'], ['personal', 'Personal Brand'], ['design', 'Design'],
];
const catName = k => (CATEGORIES.find(c => c[0] === k) || [k, k])[1];
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const md = s => (window.marked ? marked.parse(s || '') : `<p>${esc(s)}</p>`);
const fmtDate = d => { if (!d) return ''; const [y, m, dd] = String(d).slice(0, 10).split('-'); return `${dd}/${m}/${y}`; };

function phBlock(p, cls) {
  return `<div class="ph ${cls || ''}">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">` : 'Ảnh'}</div>`;
}

/* Nhúng video từ link TikTok / YouTube */
function videoEmbed(url) {
  if (!url) return '';
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/);
  if (yt) return `<div class="video video--16x9"><iframe src="https://www.youtube.com/embed/${yt[1]}" title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  const tt = url.match(/tiktok\.com\/.*\/video\/(\d+)/);
  if (tt) return `<div class="video video--9x16"><iframe src="https://www.tiktok.com/embed/v2/${tt[1]}" title="Video TikTok" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  return `<p><a class="btn btn--ghost" href="${esc(url)}" target="_blank" rel="noopener">Xem video</a></p>`;
}

let _projects, _posts, _services;
const getProjects = async () => _projects || (_projects = (await loadJSON('content/projects.json')).projects || []);
const getPosts = async () => _posts || (_posts = ((await loadJSON('content/posts.json')).posts || []).sort((a, b) => String(b.date).localeCompare(String(a.date))));
const getServices = async () => _services || (_services = (await loadJSON('content/services.json')).services || []);

function projectCard(p) {
  return `<a class="project" href="du-an.html?id=${encodeURIComponent(p.slug)}">
    ${phBlock(p)}
    <h3>${esc(p.title)}</h3>
    <div class="meta">${(p.services || []).map(s => `<span class="tag">${esc(s)}</span>`).join('')}${p.result ? `<span>· ${esc(p.result)}</span>` : ''}</div>
  </a>`;
}
async function renderProjects(sel, opt = {}) {
  const el = document.querySelector(sel); if (!el) return;
  let list = await getProjects();
  if (opt.featured) list = list.filter(p => p.featured);
  if (opt.category) list = list.filter(p => p.category === opt.category);
  if (opt.limit) list = list.slice(0, opt.limit);
  el.innerHTML = list.length ? list.map(projectCard).join('') : '<div class="empty">Chưa có dự án trong nhóm này.</div>';
}
async function renderFilters(sel, gridSel) {
  const el = document.querySelector(sel); if (!el) return;
  const startCat = new URLSearchParams(location.search).get('cat') || 'all';
  el.innerHTML = CATEGORIES.map(([k, t]) => `<button data-cat="${k}" class="${k === startCat ? 'is-active' : ''}">${t}</button>`).join('');
  const apply = k => {
    el.querySelectorAll('button').forEach(b => b.classList.toggle('is-active', b.dataset.cat === k));
    renderProjects(gridSel, k === 'all' ? {} : { category: k });
  };
  el.addEventListener('click', e => { const b = e.target.closest('button'); if (b) apply(b.dataset.cat); });
  apply(startCat);
}
/* Trang chi tiết dự án (du-an.html?id=slug) */
async function renderProjectDetail(listSel, detailSel) {
  const id = new URLSearchParams(location.search).get('id'); if (!id) return false;
  const p = (await getProjects()).find(x => x.slug === id); if (!p) return false;
  document.querySelector(listSel).style.display = 'none';
  const d = document.querySelector(detailSel); d.style.display = '';
  document.title = `${p.title} — ${window.SITE?.brand || ''}`;
  d.innerHTML = `
    <section class="page-hero"><div class="wrap">
      <span class="tag tag--signal">${esc(catName(p.category))}</span>
      <h1 style="margin-top:12px">${esc(p.title)}</h1>
      <p class="lead">${p.client ? 'Khách hàng: ' + esc(p.client) + '. ' : ''}${p.result ? 'Kết quả: ' + esc(p.result) + '.' : ''}</p>
      <div class="meta" style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">${(p.services || []).map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div>
    </div></section>
    <section class="section"><div class="wrap detail">
      ${p.video ? videoEmbed(p.video) : (p.image ? phBlock(p, 'ph--wide') : '')}
      <div class="prose">${md(p.body)}</div>
      <div class="btn-row" style="margin-top:32px"><a class="btn btn--ghost" href="du-an.html">← Tất cả dự án</a><a class="btn btn--signal" href="lien-he.html">Gửi brief dự án</a></div>
    </div></section>`;
  return true;
}

function postCard(p) {
  return `<a class="post" href="tin-tuc.html?id=${encodeURIComponent(p.slug)}">
    ${phBlock(p)}
    <div><span class="tag tag--pulse">${esc(p.tag)}</span> <span class="small">${fmtDate(p.date)}</span>
    <h3>${esc(p.title)}</h3><p>${esc(p.excerpt)}</p></div></a>`;
}
async function renderPosts(sel, limit) {
  const el = document.querySelector(sel); if (!el) return;
  let list = await getPosts(); if (limit) list = list.slice(0, limit);
  el.innerHTML = list.length ? list.map(postCard).join('') : '<div class="empty">Chưa có bài viết.</div>';
}
async function renderPostDetail(listSel, detailSel) {
  const id = new URLSearchParams(location.search).get('id'); if (!id) return false;
  const p = (await getPosts()).find(x => x.slug === id); if (!p) return false;
  document.querySelector(listSel).style.display = 'none';
  const d = document.querySelector(detailSel); d.style.display = '';
  document.title = `${p.title} — ${window.SITE?.brand || ''}`;
  d.innerHTML = `
    <section class="page-hero"><div class="wrap">
      <span class="tag tag--pulse">${esc(p.tag)}</span> <span class="small">${fmtDate(p.date)}</span>
      <h1 style="margin-top:12px">${esc(p.title)}</h1>
      <p class="lead">${esc(p.excerpt)}</p>
    </div></section>
    <section class="section"><div class="wrap detail">
      ${p.video ? videoEmbed(p.video) : (p.image ? phBlock(p, 'ph--wide') : '')}
      <div class="prose">${md(p.body)}</div>
      <div class="btn-row" style="margin-top:32px"><a class="btn btn--ghost" href="tin-tuc.html">← Tất cả bài viết</a></div>
    </div></section>`;
  return true;
}

/* Dịch vụ: thẻ ngắn (trang chủ) và khối chi tiết (trang Dịch vụ) */
async function renderServiceCards(sel) {
  const el = document.querySelector(sel); if (!el) return;
  el.innerHTML = (await getServices()).map(s => `<div class="card"><h3>${esc(s.title)}</h3><p>${esc(s.summary)}</p><a class="btn btn--ghost" href="dich-vu.html#${esc(s.slug)}">Chi tiết</a></div>`).join('');
}
async function renderServiceBlocks(sel, subnavSel) {
  const el = document.querySelector(sel); if (!el) return;
  const list = await getServices();
  if (subnavSel) document.querySelector(subnavSel).innerHTML = list.map(s => `<a href="#${esc(s.slug)}">${esc(s.title)}</a>`).join('');
  el.innerHTML = list.map((s, i) => `<section class="block two ${i % 2 ? 'flip' : ''}" id="${esc(s.slug)}">
    <div><h2>${esc(s.title)}</h2><p class="lead" style="margin-top:16px">${esc(s.summary)}</p>
      <ul class="check">${(s.items || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul>
      <a class="btn btn--signal" href="lien-he.html" style="margin-top:20px">Gửi brief</a></div>
    ${phBlock(s)}
  </section>`).join('');
  if (location.hash) setTimeout(() => document.querySelector(location.hash)?.scrollIntoView(), 100);
}
