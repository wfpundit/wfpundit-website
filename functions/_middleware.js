export async function onRequest({ request, next }) {
  const url = new URL(request.url);

  // Keep the Cloudflare Pages preview and custom domains unchanged.
  // Only redirect the public production pages.dev hostname.
  if (url.hostname === "wfpundit.pages.dev") {
    url.hostname = "www.wfpundit.uk";
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  }

  return next();
}
