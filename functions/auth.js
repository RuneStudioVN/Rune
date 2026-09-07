/* Bước 1 của đăng nhập admin: chuyển sang GitHub xin quyền */
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/callback`;
  const state = crypto.randomUUID();

  const auth = new URL('https://github.com/login/oauth/authorize');
  auth.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  auth.searchParams.set('redirect_uri', redirectUri);
  auth.searchParams.set('scope', url.searchParams.get('scope') || 'repo,user');
  auth.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: auth.toString(),
      'Set-Cookie': `csrf=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
