const ALLOWED_DOWNLOAD_HOSTS = new Set([
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
]);

function downloadRedirect({ env }) {
  const configuredUrl = env.APK_DOWNLOAD_URL?.trim();

  if (!configuredUrl) {
    return new Response('The APK download is not configured yet.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  let target;
  try {
    target = new URL(configuredUrl);
  } catch {
    return new Response('The configured APK download URL is invalid.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  if (
    target.protocol !== 'https:' ||
    !ALLOWED_DOWNLOAD_HOSTS.has(target.hostname.toLowerCase())
  ) {
    return new Response('The configured APK download host is not allowed.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: target.href,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export const onRequestGet = downloadRedirect;
export const onRequestHead = downloadRedirect;
