/* ============================================================
   layout.js — MENU + FOOTER. Thông tin liên hệ lấy từ
   content/site.json (sửa trong /admin). Menu sửa ở đây.
   ============================================================ */
const MENU = [
  ['Trang chủ', 'index.html'],
  ['Giới thiệu', 'gioi-thieu.html'],
  ['Dịch vụ', 'dich-vu.html'],
  ['Dự án', 'du-an.html'],
  ['Tin tức', 'tin-tuc.html'],
  ['Liên hệ', 'lien-he.html'],
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
  const here = location.pathname.split('/').pop() || 'index.html';
  const links = MENU.map(([t, h]) => `<a href="${h}" ${h === here ? 'class="is-active"' : ''}>${t}</a>`).join('');

  document.getElementById('header').innerHTML = `
    <header class="header"><div class="wrap">
      <a class="logo" href="index.html">${S.logo ? `<img src="${S.logo}" alt="">` : '<i></i>'}${S.logo && S.hide_brand_text ? '' : `<span>${S.brand || 'RUNESTUDIO'}</span>`}</a>
      <button class="nav-toggle" aria-label="Mở menu" aria-expanded="false">Menu</button>
      <nav class="nav">${links}</nav>
    </div></header>`;

  document.getElementById('footer').innerHTML = `
    <footer class="footer"><div class="wrap">
      <div class="grid">
        <div>
          <div class="logo">${S.logo_footer || S.logo ? `<img src="${S.logo_footer || S.logo}" alt="">` : '<i></i>'}${(S.logo_footer || S.logo) && S.hide_brand_text ? '' : `<span>${S.brand || ''}</span>`}</div>
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

  if (S.chat_bubble && S.messenger) {
    document.body.insertAdjacentHTML('beforeend', `<div class="chatbub"><a class="chatbub-msg" href="${S.messenger}" target="_blank" rel="noopener">${S.chat_bubble}</a><a class="chatbub-btn" href="${S.messenger}" target="_blank" rel="noopener" aria-label="Nhắn tin">💬</a></div>`);
  }
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
    if (ul) ul.innerHTML = services.map(s => `<li><a href="dich-vu.html#${s.slug}">${s.title}</a></li>`).join('');
  } catch (e) {}
  return S;
})();
