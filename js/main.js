/* ============================================================
   main.js — dựng dự án / tin tức / dịch vụ từ content/*.json
   Ngài không cần sửa file này.
   ============================================================ */
let CATEGORIES = [
  ['all', 'Tất cả'], ['fnb', 'F&B'], ['beauty', 'Beauty'], ['technology', 'Technology'],
  ['wedding', 'Wedding'], ['fashion', 'Fashion'], ['education', 'Education'],
  ['retail', 'Retail'], ['personal', 'Personal Brand'], ['design', 'Design'],
];
async function loadCategories() {
  try {
    const d = await loadJSON('content/categories.json');
    const list = (d.categories || []).filter(c => c && c.code && c.name);
    if (list.length) CATEGORIES = [['all', 'Tất cả'], ...list.map(c => [c.code, c.name])];
  } catch (e) {}
  return CATEGORIES;
}
/* Chuẩn hoá chuỗi để so khớp ngành: bỏ dấu, thường hoá, nối gạch */
function norm(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
/* Dự án có thuộc ngành này không — khớp cả mã lẫn tên, có dấu hay không */
function sameCat(projectCat, key) {
  const a = norm(projectCat);
  if (!a) return false;
  if (a === norm(key)) return true;
  const found = CATEGORIES.find(c => norm(c[0]) === norm(key) || norm(c[1]) === norm(key));
  return !!found && (a === norm(found[0]) || a === norm(found[1]));
}
/* Tên hiển thị của ngành */
const catName = k => {
  const f = CATEGORIES.find(c => norm(c[0]) === norm(k) || norm(c[1]) === norm(k));
  return f ? f[1] : (k || '');
};
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
  await loadCategories();
  let list = await getProjects();
  if (opt.featured) list = list.filter(p => p.featured);
  if (opt.category) list = list.filter(p => sameCat(p.category, opt.category));
  if (opt.limit) list = list.slice(0, opt.limit);
  el.innerHTML = list.length ? list.map(projectCard).join('') : '<div class="empty">Chưa có dự án trong nhóm này.</div>';
}
async function renderFilters(sel, gridSel) {
  const el = document.querySelector(sel); if (!el) return;
  await loadCategories();
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
  await loadCategories();
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
  el.innerHTML = (await getServices()).map(s => `<div class="card"><h3>${esc(s.title)}</h3><p>${esc(s.summary)}</p><a class="btn btn--ghost" href="dich-vu.html?id=${esc(s.slug)}">Chi tiết</a></div>`).join('');
}
async function renderServiceBlocks(sel, subnavSel) {
  const el = document.querySelector(sel); if (!el) return;
  const list = await getServices();
  if (subnavSel) document.querySelector(subnavSel).innerHTML = list.map(s => `<a href="#${esc(s.slug)}">${esc(s.title)}</a>`).join('');
  el.innerHTML = list.map((s, i) => `<section class="block two ${i % 2 ? 'flip' : ''}" id="${esc(s.slug)}">
    <div><h2>${esc(s.title)}</h2><div class="prose lead" style="margin-top:16px">${md(s.summary)}</div>
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
    const required = [...form.querySelectorAll('[required]')];
    const missing = required.find(f => !f.value.trim());
    if (missing) {
      const lb = form.querySelector(`label[for="${missing.id}"]`);
      msg.innerHTML = `<span style="color:#C0392B">Vui lòng điền: ${(lb ? lb.textContent : '').replace('*', '').trim()}</span>`;
      missing.focus();
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
      <div class="prose lead">${md(s.summary)}</div>
    </div></section>
    <section class="section"><div class="wrap detail">
      ${s.image ? `<div class="ph ph--wide"><img src="${esc(s.image)}" alt="${esc(s.title)}"></div>` : ''}
      ${(s.items || []).length ? `<ul class="check">${s.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
      <div class="prose" style="margin-top:24px">${md(s.body)}</div>
      <div class="btn-row" style="margin-top:32px"><a class="btn btn--signal" href="lien-he.html">Gửi brief</a><a class="btn btn--ghost" href="dich-vu.html">← Tất cả dịch vụ</a></div>
    </div></section>`;
  return true;
}

/* ---------- Trang Giới thiệu (đọc từ content/about.json) ---------- */
async function renderAbout() {
  let A; try { A = await loadJSON('content/about.json'); } catch (e) { return; }
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.textContent = val; };
  set('ab-title', A.hero_title); set('ab-lead', A.hero_lead);
  set('ab-h2', A.about_title);
  const body = document.getElementById('ab-body'); if (body) body.innerHTML = md(A.about_body);
  const img = document.getElementById('ab-img');
  if (img) img.innerHTML = A.about_image ? `<img src="${esc(A.about_image)}" alt="">` : 'Ảnh';

  const vm = document.getElementById('ab-vm');
  if (vm) vm.innerHTML = `
    <div class="card"><h3>${esc(A.vision_title || 'Tầm nhìn')}</h3><div class="prose prose--sm">${md(A.vision_body)}</div></div>
    <div class="card"><h3>${esc(A.mission_title || 'Sứ mệnh')}</h3><div class="prose prose--sm">${md(A.mission_body)}</div></div>`;

  set('ab-cap-title', A.cap_title);
  const cap = document.getElementById('ab-cap');
  if (cap) cap.innerHTML = (A.capabilities || []).map((c, i) =>
    `<div class="row"><div class="num">${String(i + 1).padStart(2, '0')}</div><h3>${esc(c.title)}</h3><div class="prose prose--sm">${md(c.desc)}</div></div>`).join('');

  set('ab-team-title', A.team_title);
  const team = document.getElementById('ab-team');
  if (team) team.innerHTML = (A.team || []).map(m =>
    `<div class="member"><div class="ph">${m.image ? `<img src="${esc(m.image)}" alt="${esc(m.name)}">` : 'Ảnh'}</div><h4>${esc(m.name)}</h4><span>${esc(m.role)}</span></div>`).join('');

  set('ab-clients-title', A.clients_title);

  // thanh mục nhỏ tự chạy theo tên khối
  const nav = document.getElementById('ab-nav');
  if (nav) {
    const items = [
      [A.about_title, '#about'], [A.vm_nav || 'Tầm nhìn / Sứ mệnh', '#vision'],
      [A.cap_title, '#capabilities'], [A.team_title, '#team'], [A.clients_title, '#clients'],
    ].filter(x => x[0]);
    nav.innerHTML = items.map(([t, h]) => `<a href="${h}">${esc(t)}</a>`).join('');
  }
  // khối kêu gọi cuối trang Giới thiệu
  set('ab-cta-title', A.cta_title);
  const abBtn = document.getElementById('ab-cta-btn');
  if (abBtn) { if (A.cta_btn) { abBtn.textContent = A.cta_btn; abBtn.href = A.cta_link || 'lien-he.html'; } else abBtn.style.display = 'none'; }
  const cl = document.getElementById('ab-clients');
  if (cl) cl.innerHTML = (A.clients || []).map(c =>
    `<div>${c.logo ? `<img src="${esc(c.logo)}" alt="${esc(c.name)}" style="max-height:44px;width:auto">` : esc(c.name || 'Logo')}</div>`).join('');
}

/* ---------- Trang chủ (đọc từ content/home.json) ---------- */
async function renderHome() {
  let H; try { H = await loadJSON('content/home.json'); } catch (e) { return; }
  window.HOME = H;
  const $ = id => document.getElementById(id);
  const txt = (id, v) => { const el = $(id); if (el) el.textContent = v || ''; };
  const btn = (id, label, link) => { const el = $(id); if (!el) return; if (label) { el.textContent = label; if (link) el.href = link; } else el.style.display = 'none'; };
  const phOrImg = (src, cls, alt) => `<div class="ph ${cls || ''}">${src ? `<img src="${esc(src)}" alt="${esc(alt || '')}">` : esc(alt || 'Ảnh')}</div>`;

  const tk = $('h-ticker');
  if (tk) {
    const items = (H.ticker || []).filter(t => t && t.text);
    if (items.length) {
      const one = items.map(t => `<span>${t.highlight ? `<b>${esc(t.text)}</b>` : esc(t.text)}</span>`).join('');
      tk.innerHTML = one + one;
    } else tk.closest('.ticker').style.display = 'none';
  }

  txt('h-about-title', H.about_title);
  if ($('h-about-body')) $('h-about-body').innerHTML = md(H.about_body);
  btn('h-about-btn', H.about_btn, H.about_btn_link);
  if ($('h-about-img')) $('h-about-img').outerHTML = phOrImg(H.about_image, 'ph ph--wide', 'Ảnh').replace('<div class="ph ph ph--wide"', '<div id="h-about-img" class="ph ph--wide"');

  txt('h-svc-title', H.services_title); txt('h-svc-lead', H.services_lead);

  txt('h-sol-title', H.solutions_title);
  if ($('h-solutions')) $('h-solutions').innerHTML = (H.solutions || []).map((s, i) =>
    `<div class="row"><div class="num">${String(i + 1).padStart(2, '0')}</div><h3>${s.link ? `<a href="${esc(s.link)}">${esc(s.title)}</a>` : esc(s.title)}</h3><div class="prose prose--sm">${md(s.desc)}</div></div>`).join('');

  txt('h-prj-title', H.projects_title); btn('h-prj-btn', H.projects_btn, 'du-an.html');

  txt('h-ind-title', H.industries_title); txt('h-ind-lead', H.industries_lead);
  if ($('h-industries')) $('h-industries').innerHTML = (H.industries || []).map(x =>
    `<a class="card" href="${esc(x.link || '#')}"><h3>${esc(x.name)}</h3><p>${esc(x.desc)}</p></a>`).join('');

  txt('h-tt-title', H.tiktok_title);
  if ($('h-tt-lead')) $('h-tt-lead').innerHTML = md(H.tiktok_lead);
  if ($('h-tt-items')) $('h-tt-items').innerHTML = (H.tiktok_items || []).map(i => `<li>${esc(i.text)}</li>`).join('');
  btn('h-tt-btn', H.tiktok_btn, H.tiktok_btn_link);
  if ($('h-tt-imgs')) $('h-tt-imgs').innerHTML = (H.tiktok_images || []).map(i => phOrImg(i.image, 'ph--9x16 ph--dark', 'Video')).join('');

  txt('h-gal-title', H.gallery_title); btn('h-gal-btn', H.gallery_btn, H.gallery_btn_link);
  if ($('h-gallery')) $('h-gallery').innerHTML = (H.gallery || []).map(g => {
    const box = phOrImg(g.image, 'ph--square', g.caption);
    return g.link ? `<a href="${esc(g.link)}" class="gal-link">${box}</a>` : box;
  }).join('');

  txt('h-case-title', H.cases_title);
  if ($('h-cases')) $('h-cases').innerHTML = (H.cases || []).map(c =>
    `<div class="card card--link" ${c.link ? `data-href="${esc(c.link)}"` : ''}>${c.tag ? `<span class="tag tag--signal">${esc(c.tag)}</span>` : ''}
      <h3>${esc(c.title)}</h3><div class="prose prose--sm">${md(c.desc)}</div>
      ${c.btn ? `<a class="btn btn--ghost" href="${esc(c.link || '#')}">${esc(c.btn)}</a>` : ''}</div>`).join('');
  document.querySelectorAll('.card--link[data-href]').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', e => { if (!e.target.closest('a')) location.href = el.dataset.href; });
  });

  if ($('h-numbers')) $('h-numbers').innerHTML = (H.numbers || []).map(n =>
    `<div><b>${esc(n.value)}</b><span>${esc(n.label)}</span></div>`).join('');

  txt('h-cli-title', H.clients_title);
  if ($('h-clients')) $('h-clients').innerHTML = (H.clients || []).map(c => {
    const inner = c.logo ? `<img src="${esc(c.logo)}" alt="${esc(c.name)}" style="max-height:44px;width:auto">` : esc(c.name || 'Logo');
    return c.link ? `<a href="${esc(c.link)}" target="_blank" rel="noopener"><div>${inner}</div></a>` : `<div>${inner}</div>`;
  }).join('');

  txt('h-post-title', H.posts_title); btn('h-post-btn', H.posts_btn, 'tin-tuc.html');

  txt('h-cta-title', H.cta_title); txt('h-cta-lead', H.cta_lead); btn('h-cta-btn', H.cta_btn, H.cta_btn_link);
}

/* ---------- Chữ cố định của các trang con (content/pages.json) ---------- */
let _pages;
const getPages = async () => _pages || (_pages = await loadJSON('content/pages.json').catch(() => ({})));

async function renderPageText() {
  const P = await getPages(); window.PAGES = P;
  const set = (id, v) => { const el = document.getElementById(id); if (el && v) el.textContent = v; };
  const cta = (t, l, b, link) => {
    set(t, P[t.replace('p-', '') + '']);
  };
  // tiêu đề + mô tả từng trang
  const map = {
    'p-svc-title': P.svc_title, 'p-svc-lead': P.svc_lead,
    'p-svc-cta-title': P.svc_cta_title, 'p-svc-cta-btn': P.svc_cta_btn,
    'p-prj-title': P.prj_title, 'p-prj-lead': P.prj_lead,
    'p-prj-cta-title': P.prj_cta_title, 'p-prj-cta-btn': P.prj_cta_btn,
    'p-news-title': P.news_title, 'p-news-lead': P.news_lead,
    'p-job-title': P.job_title, 'p-job-lead': P.job_lead,
    'p-job-cta-title': P.job_cta_title, 'p-job-cta-lead': P.job_cta_lead, 'p-job-cta-btn': P.job_cta_btn,
    'p-ct-title': P.ct_title, 'p-ct-lead': P.ct_lead,
    'p-ct-zalo': P.ct_zalo_label, 'p-ct-mess': P.ct_mess_label,
    'p-form-title': P.form_title, 'p-form-lead': P.form_lead, 'p-form-btn': P.form_btn,
    'p-form-ok-title': P.form_ok_title, 'p-form-ok-body': P.form_ok_body,
  };
  Object.entries(map).forEach(([id, v]) => set(id, v));
  set('p-form-note', P.form_note);
  // tiêu đề tab trình duyệt
  const here = location.pathname.split('/').pop() || 'index.html';
  const tabs = { 'index.html': P.tab_home, 'gioi-thieu.html': P.tab_about, 'dich-vu.html': P.tab_svc,
    'du-an.html': P.tab_prj, 'tin-tuc.html': P.tab_news, 'tuyen-dung.html': P.tab_job, 'lien-he.html': P.tab_contact };
  if (tabs[here] && !location.search.includes('id=')) document.title = tabs[here];
  // link nút CTA
  const lk = (id, v) => { const el = document.getElementById(id); if (el && v) el.href = v; };
  lk('p-svc-cta-btn', P.svc_cta_link); lk('p-prj-cta-btn', P.prj_cta_link); lk('p-job-cta-btn', P.job_cta_link);
}

/* Dựng các ô của form Project Brief từ pages.json */
async function renderBriefFields(sel) {
  const el = document.querySelector(sel); if (!el) return;
  const P = await getPages();
  const list = (P.fields || []).filter(f => f && f.name && f.label);
  if (!list.length) return;
  const one = f => `<div class="field">
      <label for="f-${esc(f.name)}">${esc(f.label)}${f.required ? ' *' : ''}</label>
      ${f.long
        ? `<textarea id="f-${esc(f.name)}" name="${esc(f.name)}" placeholder="${esc(f.placeholder || '')}"></textarea>`
        : `<input id="f-${esc(f.name)}" name="${esc(f.name)}" type="text" ${f.required ? 'required' : ''} placeholder="${esc(f.placeholder || '')}">`}
    </div>`;
  // ghép 2 ô ngắn liên tiếp thành 1 hàng
  const html = []; let i = 0;
  while (i < list.length) {
    const a = list[i], bnext = list[i + 1];
    if (!a.long && bnext && !bnext.long) { html.push(`<div class="field-row">${one(a)}${one(bnext)}</div>`); i += 2; }
    else { html.push(one(a)); i += 1; }
  }
  el.innerHTML = html.join('');
}
