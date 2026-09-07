/* Bước 2: GitHub gọi về đây, đổi code lấy token rồi trả cho trang admin */
function page(status, content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Đang đăng nhập…</title></head>
<body style="font-family:system-ui;padding:40px;text-align:center">
<p>Đang xử lý đăng nhập…</p>
<script>
(function () {
  function send() {
    window.opener && window.opener.postMessage(
      'authorization:github:${status}:${JSON.stringify(content).replace(/'/g, "\\\\'")}',
      '*'
    );
  }
  window.addEventListener('message', send, false);
  window.opener && window.opener.postMessage('authorizing:github', '*');
  setTimeout(function(){ send(); setTimeout(function(){ window.close(); }, 800); }, 300);
})();
</script>
</body></html>`;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const headers = { 'Content-Type': 'text/html; charset=utf-8' };

  if (!code) return new Response(page('error', { message: 'Thiếu mã xác thực' }), { headers });

  try {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const data = await res.json();
    if (data.error || !data.access_token) {
      return new Response(page('error', { message: data.error_description || 'Không lấy được token' }), { headers });
    }
    return new Response(page('success', { token: data.access_token, provider: 'github' }), { headers });
  } catch (e) {
    return new Response(page('error', { message: String(e) }), { headers });
  }
}
