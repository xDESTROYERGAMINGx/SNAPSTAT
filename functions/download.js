export async function onRequestGet({ env }) {
  const target = env.APK_DOWNLOAD_URL;

  if (!target) {
    return new Response('Download is not configured.', {
      status: 503,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  let url;
  try {
    url = new URL(target);
  } catch {
    return new Response('Download URL is invalid.', {
      status: 500,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  if (url.protocol !== 'https:') {
    return new Response('Download URL must use HTTPS.', {
      status: 500,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  return Response.redirect(url.toString(), 302);
}
