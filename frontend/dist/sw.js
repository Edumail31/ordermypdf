// Service Worker for OrderMyPDF - Background Upload Support
const CACHE_NAME = "ordermypdf-v1";

// Install event
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker");
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("[SW] Service worker activated");
  event.waitUntil(clients.claim());
});

// Background Sync for uploads
self.addEventListener("sync", (event) => {
  console.log("[SW] Sync event received:", event.tag);

  if (event.tag.startsWith("upload-")) {
    event.waitUntil(handleBackgroundUpload(event.tag));
  }
});

// Handle background upload
async function handleBackgroundUpload(tag) {
  const uploadId = tag.replace("upload-", "");

  try {
    // Get upload data from IndexedDB
    const uploadData = await getUploadData(uploadId);
    if (!uploadData) {
      console.log("[SW] No upload data found for:", uploadId);
      return;
    }

    console.log("[SW] Starting background upload for:", uploadId);

    // Perform the upload
    const formData = new FormData();
    uploadData.files.forEach((file, index) => {
      formData.append("files", file, file.name);
    });
    formData.append("prompt", uploadData.prompt);
    if (uploadData.contextQuestion) {
      formData.append("context_question", uploadData.contextQuestion);
    }
    formData.append("session_id", uploadData.sessionId);

    const response = await fetch("/submit", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();

    // Notify the client about successful upload
    await notifyClients({
      type: "UPLOAD_COMPLETE",
      uploadId,
      jobId: result.job_id,
      result,
    });

    // Clean up stored upload data
    await deleteUploadData(uploadId);

    console.log("[SW] Background upload completed:", uploadId);
  } catch (error) {
    console.error("[SW] Background upload failed:", error);

    // Notify client about failure
    await notifyClients({
      type: "UPLOAD_FAILED",
      uploadId,
      error: error.message,
    });
  }
}

// IndexedDB operations
const DB_NAME = "ordermypdf-uploads";
const STORE_NAME = "pending-uploads";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

async function getUploadData(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function deleteUploadData(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Notify all clients
async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: "window" });
  clients.forEach((client) => {
    client.postMessage(message);
  });
}

// Handle messages from main thread
self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);

  if (event.data.type === "PING") {
    event.ports[0].postMessage({ type: "PONG" });
  }
});
