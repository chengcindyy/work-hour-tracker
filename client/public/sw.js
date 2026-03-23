const CACHE_NAME = "work-hour-tracker-v3";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
];

// 安裝 Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// 激活 Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 開發環境（localhost）：不攔截，讓請求直接打到伺服器，避免快取舊的 HMR WebSocket 設定
const isDev = self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1";

// 離線 fallback：避免 respondWith 收到 undefined 導致 TypeError
const OFFLINE_HTML = new Response(
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>離線</title></head><body style="font-family:system-ui;padding:2rem;text-align:center"><h1>目前無法連線</h1><p>請檢查網路連線後再試。</p></body></html>',
  { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503, statusText: "Service Unavailable" }
);
const OFFLINE_JSON = new Response(
  JSON.stringify({ error: "離線", message: "請檢查網路連線後再試。" }),
  { headers: { "Content-Type": "application/json" }, status: 503, statusText: "Service Unavailable" }
);

// 攔截請求
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 開發環境不攔截，避免快取導致 HMR WebSocket 連到錯誤 port
  if (isDev) {
    return;
  }

  // 跳過非 GET 請求
  if (request.method !== "GET") {
    return;
  }

  // 跳過 API 請求（允許在線時使用最新數據）
  if (request.url.includes("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 複製響應以便緩存
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached ?? OFFLINE_JSON)
        )
    );
    return;
  }

  // HTML / 導航請求：Network First（優先從網路取得最新版本，deploy 後用戶可即時取得更新）
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "reload" })
        .then((response) => {
          if (response && response.status === 200 && response.type !== "error") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request)
            .then((c) => c ?? caches.match("/"))
            .then((c) => c ?? caches.match("/index.html"))
            .then((c) => c ?? OFFLINE_HTML)
        )
    );
    return;
  }

  // 靜態資源（JS、CSS 等）：優先使用緩存，失敗時使用網絡
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(request)
        .then((response) => {
          // 不緩存非成功的響應
          if (!response || response.status !== 200 || response.type === "error") {
            return response;
          }

          // 複製響應以便緩存
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });

          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached ?? OFFLINE_HTML)
        );
    })
  );
});

// 推播通知
self.addEventListener("push", (event) => {
  let title = "工時登記系統";
  let body = "別忘了登記今天的工時喔！";
  let tag = "work-hour-reminder";
  if (event.data) {
    try {
      const data = event.data.json();
      if (data.title) title = data.title;
      if (data.body) body = data.body;
      if (data.tag) tag = data.tag;
    } catch {
      body = event.data.text() || body;
    }
  }
  const options = {
    body,
    icon: "/android-chrome-192x192.png",
    badge: "/android-chrome-192x192.png",
    tag,
    renotify: true,
    vibrate: [200, 100, 200],
    silent: false,
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      if (navigator.setAppBadge) {
        return navigator.setAppBadge();
      }
    })
  );
});

// 通知點擊
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    Promise.resolve()
      .then(() => {
        if (navigator.clearAppBadge) {
          return navigator.clearAppBadge();
        }
      })
      .then(() => clients.matchAll({ type: "window" }))
      .then((clientList) => {
        const origin = self.location.origin;
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.startsWith(origin) && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow("/");
        }
      })
  );
});

// 後台同步（用於離線時的數據同步）
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-work-records") {
    event.waitUntil(syncWorkRecords());
  }
});

async function syncWorkRecords() {
  try {
    // 這裡可以實現離線數據同步邏輯
    // 例如：從本地存儲獲取待同步的數據，然後發送到服務器
    console.log("同步工時紀錄...");
  } catch (error) {
    console.error("同步失敗:", error);
  }
}
