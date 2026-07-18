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

  const upstream = await fetch(url.toString(), {
    headers: {
      'user-agent': 'SnapStat website download proxy',
      accept: 'application/vnd.android.package-archive, application/octet-stream, */*',
    },
    redirect: 'follow',
  });

  if (!upstream.ok || !upstream.body) {
    return new Response('Download is temporarily unavailable.', {
      status: 502,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  const headers = new Headers();
  headers.set('content-type', 'application/vnd.android.package-archive');
  headers.set('content-disposition', 'attachment; filename="snapstat.apk"');
  headers.set('cache-control', 'no-store');
  headers.set('x-content-type-options', 'nosniff');

  const contentLength = upstream.headers.get('content-length');
  if (contentLength) headers.set('content-length', contentLength);

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}
