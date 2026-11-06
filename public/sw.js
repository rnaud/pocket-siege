const CACHE = "pocket-siege-v2";

async function precache() {
  const cache = await caches.open(CACHE);
  const page = await fetch("./", { cache: "reload" });
  await cache.put("./", page.clone());
  const html = await page.text();
  const urls = new Set(["./manifest.webmanifest"]);
  // Art loaded by JS or CSS is not discoverable from the HTML alone.
  for (const path of [
    "art/paper-islands.webp",
    "art/paper-grain.webp",
    "art/moss-body-paper.webp",
    "art/coral-body-paper.webp",
    "art/moss-hurt-paper.webp",
    "art/coral-hurt-paper.webp",
    "art/moss-soldier-paper.webp",
    "art/coral-soldier-paper.webp",
    "art/weapon-rocket.webp",
    "art/weapon-grenade.webp",
    "art/weapon-mortar.webp",
    "art/weapon-sticky.webp",
    "art/weapon-mine.webp",
    "art/crate-paper.webp",
    "art/paper-emblem.webp",
    "art/favicon.png",
    "art/icon-192.png",
    "art/icon-512.png",
    "art/apple-touch-icon.png",
  ]) {
    urls.add(new URL(path, self.registration.scope).href);
  }
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
        const cached = await cache.match(request, { ignoreVary: true });
        if (cached) return cached;
        if (request.mode === "navigate") {
          const fallback = await cache.match("./", { ignoreVary: true });
          if (fallback) return fallback;
        }
        return Response.error();
      }
    })(),
  );
});
