/* ============================================================
   layout.js — MENU + FOOTER. Thông tin liên hệ lấy từ
   content/site.json (sửa trong /admin). Menu sửa ở đây.
   ============================================================ */
/* Menu mặc định — dùng khi chưa có content/menu.json */
const MENU_MACDINH = [
  { label: 'Trang chủ', link: 'index.html', children: [] },
  { label: 'Giới thiệu', link: 'gioi-thieu.html', children: [] },
  { label: 'Dịch vụ', link: 'dich-vu.html', children: [] },
  { label: 'Dự án', link: 'du-an.html', children: [] },
  { label: 'Tin tức', link: 'tin-tuc.html', children: [] },
  { label: 'Tuyển dụng', link: 'tuyen-dung.html', children: [] },
  { label: 'Liên hệ', link: 'lien-he.html', children: [] },
];

async function loadJSON(path) {
  const r = await fetch(path + '?v=' + Date.now());
  if (!r.ok) throw new Error(path);
  return r.json();
}

window.SITE_READY = (async () => {
  let S = {};
  try { S = await loadJSON('content/site.json'); } catch (e) { console.warn('site.json', e); }
  window.SITE = S;
  const SLOGAN = (S.slogan === undefined || S.slogan === null) ? 'Sáng tạo để tạo dấu ấn' : S.slogan;
  let MENU = MENU_MACDINH;
  try { const m = await loadJSON('content/menu.json'); if (m && m.items && m.items.length) MENU = m.items; } catch (e) {}
  window.MENU = MENU;

  const here = location.pathname.split('/').pop() || 'index.html';
  const isHere = href => String(href || '').split('?')[0].split('#')[0] === here;
  const links = MENU.map(m => {
    const kids = (m.children || []).filter(k => k && k.label);
    const active = isHere(m.link) || kids.some(k => isHere(k.link));
    if (!kids.length) return `<a href="${m.link || '#'}" ${active ? 'class="is-active"' : ''}>${m.label}</a>`;
    return `<div class="has-sub ${active ? 'is-active' : ''}">
      <a href="${m.link || '#'}">${m.label}<span class="caret" aria-hidden="true">▾</span></a>
      <div class="sub">${kids.map(k => `<a href="${k.link || '#'}">${k.label}</a>`).join('')}</div>
    </div>`;
  }).join('');

  document.getElementById('header').innerHTML = `
    <header class="header"><div class="wrap">
      <a class="logo" href="index.html">${S.logo ? `<img src="${S.logo}" alt="">` : '<i></i>'}${S.logo && S.hide_brand_text ? '' : `<span class="logo-text"><b>${S.brand || 'Rune Studio'}</b>${SLOGAN ? `<i>${SLOGAN}</i>` : ''}</span>`}</a>
      <button class="nav-toggle" aria-label="Mở menu" aria-expanded="false">Menu</button>
      <nav class="nav">${links}</nav>
    </div></header>`;

  document.getElementById('footer').innerHTML = `
    <footer class="footer"><div class="wrap">
      <div class="grid">
        <div>
          <div class="logo">${S.logo_footer || S.logo ? `<img src="${S.logo_footer || S.logo}" alt="">` : '<i></i>'}${(S.logo_footer || S.logo) && S.hide_brand_text ? '' : `<span class="logo-text"><b>${S.brand || ''}</b>${SLOGAN ? `<i>${SLOGAN}</i>` : ''}</span>`}</div>
          <p>${S.tagline || ''}</p>
          <p style="margin-top:12px">${S.address || ''}<br>${S.phone || ''}<br>${S.email || ''}</p>
        </div>
        <div><h4>Dịch vụ</h4><ul id="footer-services"></ul></div>
        <div><h4>Công ty</h4><ul>
          <li><a href="gioi-thieu.html">Giới thiệu</a></li>
          <li><a href="du-an.html">Dự án</a></li>
          <li><a href="tin-tuc.html">Tin tức</a></li>
          <li><a href="lien-he.html">Liên hệ</a></li>
        </ul></div>
        <div><h4>Kết nối</h4><ul>
          <li><a href="${S.tiktok || '#'}" target="_blank" rel="noopener">TikTok</a></li>
          <li><a href="${S.facebook || '#'}" target="_blank" rel="noopener">Facebook</a></li>
          <li><a href="${S.zalo || '#'}" target="_blank" rel="noopener">Zalo</a></li>
          <li><a href="${S.messenger || '#'}" target="_blank" rel="noopener">Messenger</a></li>
        </ul></div>
      </div>
      <div class="bottom"><span>© ${new Date().getFullYear()} ${S.brand || ''}. All rights reserved.</span><span>Made in Việt Nam</span></div>
    </div></footer>`;

  if (S.favicon) {
    let ic = document.querySelector('link[rel="icon"]');
    if (!ic) { ic = document.createElement('link'); ic.rel = 'icon'; document.head.appendChild(ic); }
    ic.href = S.favicon;
  }
  const btn = document.querySelector('.nav-toggle'), nav = document.querySelector('.nav');
  btn.addEventListener('click', () => { const o = nav.classList.toggle('is-open'); btn.setAttribute('aria-expanded', o); });

  /* ---- Cột nút liên hệ nổi bên phải (cố định) ---- */
  (function buildDock() {
    const ic = {
      phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
      facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z"/></svg>',
      messenger: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.3 2 2 6.2 2 11.8c0 3 1.4 5.6 3.6 7.4V23l3.3-1.8c.9.2 1.8.4 2.8.4 5.7 0 10-4.2 10-9.8S17.7 2 12 2zm1 13.2-2.5-2.7-4.9 2.7 5.4-5.7 2.6 2.7 4.8-2.7-5.4 5.7z"/></svg>',
      zalo: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 5.9 2 10.7c0 2.7 1.4 5.1 3.7 6.7-.1.6-.5 2-.6 2.3-.2.5.2.5.4.4.2-.1 2.5-1.6 3.5-2.3.9.2 2 .3 3 .3 5.5 0 10-3.9 10-8.7S17.5 2 12 2z"/></svg>'
    };
    const items = [];
    if (S.phone) items.push(['tel:' + S.phone.replace(/\s/g, ''), ic.phone, 'Gọi ' + S.phone, '']);
    if (S.facebook) items.push([S.facebook, ic.facebook, 'Fanpage', '_blank']);
    if (S.messenger) items.push([S.messenger, ic.messenger, 'Messenger', '_blank']);
    if (S.zalo) items.push([S.zalo, ic.zalo, 'Zalo', '_blank']);
    if (!items.length) return;

    const note = S.chat_bubble ? `<a class="dock-note" href="lien-he.html">${S.chat_bubble}</a>` : '';
    const btns = items.map(([href, svg, label, tg]) =>
      `<a class="dock-btn" href="${href}" ${tg ? 'target="_blank" rel="noopener"' : ''} aria-label="${label}"><span class="dock-ico">${svg}</span><span class="dock-tip">${label}</span></a>`).join('');

    const dock = document.createElement('div');
    dock.className = 'dock';
    dock.innerHTML = note + btns;
    document.body.appendChild(dock);
  })();

  document.querySelectorAll('[data-contact="zalo"]').forEach(a => a.href = S.zalo || '#');
  document.querySelectorAll('[data-contact="messenger"]').forEach(a => a.href = S.messenger || '#');
  document.querySelectorAll('[data-site]').forEach(el => {
    const k = el.dataset.site; if (!S[k]) return;
    if (el.tagName === 'A') { if (k === 'email') el.href = 'mailto:' + S[k]; if (k === 'phone') el.href = 'tel:' + S[k].replace(/\s/g, ''); }
    else el.textContent = S[k];
  });

  try {
    const { services } = await loadJSON('content/services.json');
    const ul = document.getElementById('footer-services');
    if (ul) ul.innerHTML = services.map(s => `<li><a href="dich-vu.html?id=${s.slug}">${s.title}</a></li>`).join('');
  } catch (e) {}
  return S;
})();
