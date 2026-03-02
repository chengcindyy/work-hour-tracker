const CACHE_NAME = "work-hour-tracker-v1";
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
    })
  );
});

// 攔截請求
self.addEventListener("fetch", (event) => {
  const { request } = event;

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
        .catch(() => {
          // 在線失敗時，嘗試從緩存返回
          return caches.match(request);
        })
    );
    return;
  }

  // 靜態資源：優先使用緩存，失敗時使用網絡
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
        .catch(() => {
          // 離線時返回緩存的版本
          return caches.match(request);
        });
    })
  );
});

// 推播通知
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "工時登記提醒",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: "work-hour-reminder",
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification("工時登記系統", options)
  );
});

// 通知點擊
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // 檢查是否已有打開的窗口
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }
      // 如果沒有打開的窗口，打開新窗口
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
