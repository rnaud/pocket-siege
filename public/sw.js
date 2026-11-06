const CACHE = "pocket-siege-v1";

async function precache() {
  const cache = await caches.open(CACHE);
  const page = await fetch("./", { cache: "reload" });
  await cache.put("./", page.clone());
  const html = await page.text();
  const urls = new Set(["./manifest.webmanifest"]);
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const value = match[1];
    if (!value || value.startsWith("http") || value.startsWith("data:"))
      continue;
    urls.add(new URL(value, self.registration.scope).href);
  }
  await Promise.all([...urls].map((url) => cache.add(url).catch(() => {})));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== location.origin) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(request);
        if (fresh.ok) cache.put(request, fresh.clone());
        return fresh;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const fallback = await cache.match("./");
          if (fallback) return fallback;
        }
        return Response.error();
      }
    })(),
  );
});
