const CACHE_NAME = "facepdf-cache-v3";

// まず確実に必要な静的ファイルを全部列挙
const ASSETS = [
  "./",
  "./index.html",
  "./main.js",
  "./manifest.webmanifest",

  // pdf.js
  "./pdfjs/pdf.min.js",
  "./pdfjs/pdf.worker.min.js",

  // mediapipe
  "./mediapipe/camera_utils/camera_utils.js",
  "./mediapipe/face_mesh/face_mesh.js",
  "./mediapipe/face_mesh/face_mesh_solution_simd_wasm_bin.js",
  "./mediapipe/face_mesh/face_mesh_solution_simd_wasm_bin.wasm",
  "./mediapipe/face_mesh/face_mesh_solution_packed_assets.data",

  // icons（無くても動くけど、あるならキャッシュ）
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null))
      )
    )
  );
  self.clients.claim();
});

// オフライン優先：キャッシュがあれば必ずキャッシュ
self.addEventListener("fetch", (event) => {
  const req = event.request;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          // 成功レスポンスだけキャッシュ
          if (!res || res.status !== 200 || res.type !== "basic") return res;

          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => {
          // ネット断で未キャッシュの場合は index を返す（最低限の救済）
          // ※ ただし wasms など未キャッシュは動かないので、ASSETS漏れを直すのが本筋
          return caches.match("./index.html");
        });
    })
  );
});
