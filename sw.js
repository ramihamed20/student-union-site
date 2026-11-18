'use strict';

const cachePrefix = 'student-union-site-shell-';
const cacheName = cachePrefix + 'v2';
const scope = new URL(self.registration.scope);
const indexUrl = new URL('index.html', scope).href;
const shellUrls = [
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
].map(path => new URL(path, scope).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(shellUrls.map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(cachePrefix) && key !== cacheName)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function servePage(request) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(indexUrl, response.clone()).catch(() => {});
    if (response.status < 500) return response;
  } catch {
    // The connection is unavailable. Use the most recently cached page.
  }
  return (await cache.match(indexUrl)) || Response.error();
}

async function serveAsset(request) {
  const cache = await caches.open(cacheName);
  return (await cache.match(request)) || fetch(request);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== scope.origin) return;
  if (request.mode === 'navigate' && (url.pathname === scope.pathname || url.pathname === new URL(indexUrl).pathname)) {
    event.respondWith(servePage(request));
  } else if (shellUrls.includes(url.href)) {
    event.respondWith(serveAsset(request));
  }
});
