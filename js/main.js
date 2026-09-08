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
/* Chuyển markdown sang HTML — tự viết, không phụ thuộc thư viện ngoài */
function md(src) {
  if (!src) return '';
  const inline = s => esc(s)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, '<img src="$2" alt="$1" loading="lazy">')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let list = null, para = [], quote = [];
  const flushPara = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>` + list.items.map(i => '<li>' + inline(i) + '</li>').join('') + `</${list.tag}>`); list = null; } };
  const flushQuote = () => { if (quote.length) { out.push('<blockquote><p>' + inline(quote.join(' ')) + '</p></blockquote>'); quote = []; } };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushAll(); continue; }
    if (/^\s*<(p|div|h[1-6]|ul|ol|li|figure|img|blockquote|hr|table|iframe|span|section)\b/i.test(line)) { flushAll(); out.push(line); continue; }
    let mm;
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { flushAll(); out.push('<hr>'); continue; }
    if ((mm = line.match(/^(#{1,4})\s+(.*)$/))) { flushAll(); const lv = mm[1].length + 1; out.push(`<h${lv}>${inline(mm[2])}</h${lv}>`); continue; }
    if ((mm = line.match(/^\s*>\s?(.*)$/))) { flushPara(); flushList(); quote.push(mm[1]); continue; }
    if ((mm = line.match(/^\s*[-*+]\s+(.*)$/))) { flushPara(); flushQuote(); if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; } list.items.push(mm[1]); continue; }
    if ((mm = line.match(/^\s*\d+[.)]\s+(.*)$/))) { flushPara(); flushQuote(); if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; } list.items.push(mm[1]); continue; }
    flushList(); flushQuote(); para.push(line.trim());
  }
  flushAll();
  return out.join('\n');
}
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
      <div class="btn-row" style="margin-top:20px"><a class="btn btn--signal" href="dich-vu.html?id=${esc(s.slug)}">Chi tiết</a><a class="btn btn--ghost" href="lien-he.html">Gửi brief</a></div></div>
    ${phBlock(s)}
  </section>`).join('');
  if (location.hash) setTimeout(() => document.querySelector(location.hash)?.scrollIntoView(), 100);
}

/* Hero trang chủ từ content/hero.json */
async function renderHero() {
  let H; try { H = await loadJSON('content/hero.json'); } catch (e) { return; }
  const $ = id => document.getElementById(id);
  if (H.hero_title) $('hero-title').textContent = H.hero_title;
  if (H.hero_subtitle) $('hero-sub').textContent = H.hero_subtitle;
  if (H.hero_btn1) { $('hero-btn1').innerHTML = esc(H.hero_btn1) + ' <span>→</span>'; $('hero-btn1').href = H.hero_btn1_link || '#'; }
  if (H.hero_btn2) { $('hero-btn2').textContent = H.hero_btn2; if (H.hero_btn2_link) { $('hero-btn2').href = H.hero_btn2_link; $('hero-btn2').removeAttribute('data-contact'); } }
  $('hero-stats').innerHTML = (H.stats || []).slice(0, 4).map(s => `<div class="stat"><span>${esc(s.label)}</span><b>${esc(s.value)}</b></div>`).join('');
  if (H.hero_poster) $('hero-poster').innerHTML = `<img src="${esc(H.hero_poster)}" alt="">`;
  const hl = $('hero-highlight');
  if (H.highlight_title) {
    hl.href = H.highlight_link || '#';
    $('hl-label').textContent = H.highlight_label || '';
    $('hl-title').textContent = H.highlight_title;
    $('hl-meta1').textContent = H.highlight_meta1 || '';
    $('hl-meta2').textContent = H.highlight_meta2 || '';
    $('hl-btn').textContent = H.highlight_btn || 'Xem';
    if (H.highlight_image) $('hl-img').innerHTML = `<img src="${esc(H.highlight_image)}" alt="">`;
  } else hl.style.display = 'none';
}

/* Gửi form Project Brief về email (Web3Forms) */
function initBriefForm() {
  const form = document.getElementById('brief-form');
  if (!form) return;
  const btn = document.getElementById('brief-submit');
  const msg = document.getElementById('brief-msg');
  const ok = document.getElementById('brief-ok');
  const key = (window.SITE || {}).form_key;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = form.querySelector('[name="Tên"]');
    const phone = form.querySelector('[name="Điện thoại"]');
    if (!name.value.trim() || !phone.value.trim()) {
      msg.innerHTML = '<span style="color:#C0392B">Vui lòng điền tên và số điện thoại.</span>';
      (!name.value.trim() ? name : phone).focus();
      return;
    }
    if (!key) {
      msg.innerHTML = '<span style="color:#C0392B">Form chưa được cấu hình. Bạn vui lòng nhắn qua Zalo giúp mình nhé.</span>';
      return;
    }

    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = 'Đang gửi…';
    msg.textContent = '';

    const data = { access_key: key, subject: 'Brief mới từ website Rune Studio', from_name: 'Website Rune Studio' };
    new FormData(form).forEach((v, k) => { if (v) data[k] = v; });

    try {
      const r = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      });
      const j = await r.json();
      if (j.success) { form.style.display = 'none'; ok.style.display = 'block'; }
      else throw new Error(j.message || 'Lỗi gửi');
    } catch (err) {
      msg.innerHTML = '<span style="color:#C0392B">Gửi không thành công. Bạn nhắn giúp mình qua Zalo hoặc Messenger nhé.</span>';
      btn.disabled = false; btn.textContent = old;
    }
  });
}

/* ---------- Tuyển dụng ---------- */
let _jobs;
const getJobs = async () => _jobs || (_jobs = (await loadJSON('content/jobs.json')).jobs || []);

async function renderJobs(sel) {
  const el = document.querySelector(sel); if (!el) return;
  const list = await getJobs();
  if (!list.length) { el.innerHTML = '<div class="empty">Hiện chưa có vị trí nào đang tuyển.</div>'; return; }
  el.innerHTML = list.map(j => `<a class="job ${j.open === false ? 'is-closed' : ''}" href="tuyen-dung.html?id=${encodeURIComponent(j.slug)}">
    <div>
      <h3>${esc(j.title)}</h3>
      ${j.excerpt ? `<p>${esc(j.excerpt)}</p>` : ''}
      <div class="job-meta">
        ${j.place ? `<span class="tag">${esc(j.place)}</span>` : ''}
        ${j.type ? `<span class="tag">${esc(j.type)}</span>` : ''}
        ${j.salary ? `<span class="tag tag--pulse">${esc(j.salary)}</span>` : ''}
        ${j.open === false ? '<span class="tag">Đã đóng</span>' : ''}
      </div>
    </div>
    <span class="job-arrow">→</span>
  </a>`).join('');
}

async function renderJobDetail(listSel, detailSel) {
  const id = new URLSearchParams(location.search).get('id'); if (!id) return false;
  const j = (await getJobs()).find(x => x.slug === id); if (!j) return false;
  document.querySelector(listSel).style.display = 'none';
  const d = document.querySelector(detailSel); d.style.display = '';
  document.title = `${j.title} — ${window.SITE?.brand || ''}`;
  d.innerHTML = `
    <section class="page-hero"><div class="wrap">
      <h1>${esc(j.title)}</h1>
      <div class="job-meta" style="margin-top:16px">
        ${j.place ? `<span class="tag">${esc(j.place)}</span>` : ''}
        ${j.type ? `<span class="tag">${esc(j.type)}</span>` : ''}
        ${j.salary ? `<span class="tag tag--pulse">${esc(j.salary)}</span>` : ''}
        ${j.deadline ? `<span class="tag">Hạn: ${fmtDate(j.deadline)}</span>` : ''}
      </div>
    </div></section>
    <section class="section"><div class="wrap detail">
      ${j.image ? `<div class="ph ph--wide"><img src="${esc(j.image)}" alt="${esc(j.title)}"></div>` : ''}
      <div class="prose">${md(j.body)}</div>
      <div class="btn-row" style="margin-top:32px"><a class="btn btn--signal" href="lien-he.html">Ứng tuyển</a><a class="btn btn--ghost" href="tuyen-dung.html">← Tất cả vị trí</a></div>
    </div></section>`;
  return true;
}

/* Trang chi tiết 1 dịch vụ (dich-vu.html?id=slug) */
async function renderServiceDetail(listSel, detailSel) {
  const id = new URLSearchParams(location.search).get('id'); if (!id) return false;
  const s = (await getServices()).find(x => x.slug === id); if (!s) return false;
  document.querySelector(listSel).style.display = 'none';
  const d = document.querySelector(detailSel); d.style.display = '';
  document.title = `${s.title} — ${window.SITE?.brand || ''}`;
  d.innerHTML = `
    <section class="page-hero"><div class="wrap">
      <h1>${esc(s.title)}</h1>
      <p class="lead">${esc(s.summary)}</p>
    </div></section>
    <section class="section"><div class="wrap detail">
      ${s.image ? `<div class="ph ph--wide"><img src="${esc(s.image)}" alt="${esc(s.title)}"></div>` : ''}
      ${(s.items || []).length ? `<ul class="check">${s.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
      <div class="prose" style="margin-top:24px">${md(s.body)}</div>
      <div class="btn-row" style="margin-top:32px"><a class="btn btn--signal" href="lien-he.html">Gửi brief</a><a class="btn btn--ghost" href="dich-vu.html">← Tất cả dịch vụ</a></div>
    </div></section>`;
  return true;
}
