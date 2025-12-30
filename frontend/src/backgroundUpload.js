// Background Upload Utilities for Mobile Support
// Uses Service Worker Background Sync API + Wake Lock API

const DB_NAME = "ordermypdf-uploads";
const STORE_NAME = "pending-uploads";

// IndexedDB helper
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

// Store upload data in IndexedDB for background sync
export async function storeUploadData(
  uploadId,
  files,
  prompt,
  sessionId,
  contextQuestion = null
) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const data = {
      id: uploadId,
      files: files,
      prompt,
      sessionId,
      contextQuestion,
      timestamp: Date.now(),
    };

    const request = store.put(data);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(uploadId);
  });
}

// Check if Background Sync API is supported
export function isBackgroundSyncSupported() {
  return "serviceWorker" in navigator && "SyncManager" in window;
}

// Check if Wake Lock API is supported
export function isWakeLockSupported() {
  return "wakeLock" in navigator;
}

// Register background sync for upload
export async function registerBackgroundSync(uploadId) {
  if (!isBackgroundSyncSupported()) {
    console.log("[BG] Background Sync not supported");
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(`upload-${uploadId}`);
    console.log("[BG] Background sync registered for:", uploadId);
    return true;
  } catch (error) {
    console.error("[BG] Failed to register background sync:", error);
    return false;
  }
}

// Wake Lock management
let wakeLock = null;

export async function requestWakeLock() {
  if (!isWakeLockSupported()) {
    console.log("[WL] Wake Lock not supported");
    return null;
  }

  try {
    wakeLock = await navigator.wakeLock.request("screen");
    console.log("[WL] Wake Lock acquired");

    // Re-acquire wake lock if released (e.g., tab becomes visible again)
    wakeLock.addEventListener("release", () => {
      console.log("[WL] Wake Lock released");
    });

    return wakeLock;
  } catch (error) {
    console.error("[WL] Failed to acquire Wake Lock:", error);
    return null;
  }
}

export async function releaseWakeLock() {
  if (wakeLock) {
    try {
      await wakeLock.release();
      wakeLock = null;
      console.log("[WL] Wake Lock manually released");
    } catch (error) {
      console.error("[WL] Failed to release Wake Lock:", error);
    }
  }
}

// Re-acquire wake lock when page becomes visible
export function setupWakeLockReacquisition() {
  document.addEventListener("visibilitychange", async () => {
    if (wakeLock !== null && document.visibilityState === "visible") {
      await requestWakeLock();
    }
  });
}

// Register service worker
export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.log("[SW] Service Worker not supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.log("[SW] Service Worker registered:", registration.scope);

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    console.log("[SW] Service Worker ready");

    return registration;
  } catch (error) {
    console.error("[SW] Service Worker registration failed:", error);
    return null;
  }
}

// Listen for messages from service worker
export function onServiceWorkerMessage(callback) {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("message", (event) => {
    callback(event.data);
  });
}

// Generate unique upload ID
export function generateUploadId() {
  return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Enhanced upload with background support
export async function uploadWithBackgroundSupport(
  files,
  prompt,
  sessionId,
  contextQuestion,
  onProgress,
  onUploadComplete,
  onError
) {
  const uploadId = generateUploadId();

  // Request wake lock to prevent device sleep during upload
  await requestWakeLock();

  // Store upload data for potential background sync recovery
  try {
    await storeUploadData(uploadId, files, prompt, sessionId, contextQuestion);
    console.log("[Upload] Data stored in IndexedDB for background recovery");
  } catch (e) {
    console.warn("[Upload] Failed to store in IndexedDB:", e);
  }

  // Create FormData
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  formData.append("prompt", prompt);
  if (contextQuestion) {
    formData.append("context_question", contextQuestion);
  }
  formData.append("session_id", sessionId);

  // Use XHR for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track if we should try background sync on failure
    let shouldTryBackgroundSync = true;

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress?.(percent);

        // If upload started successfully, don't use background sync for this upload
        if (percent > 5) {
          shouldTryBackgroundSync = false;
        }
      }
    });

    xhr.addEventListener("load", async () => {
      // Release wake lock after upload completes
      await releaseWakeLock();

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);

          // Clean up IndexedDB entry on success
          try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            store.delete(uploadId);
          } catch (e) {
            console.warn("[Upload] Failed to clean up IndexedDB:", e);
          }

          onUploadComplete?.(result);
          resolve({ success: true, result, uploadId });
        } catch (e) {
          const error = new Error("Invalid response from server");
          onError?.(error);
          reject(error);
        }
      } else {
        const error = new Error(`Upload failed: ${xhr.status}`);
        onError?.(error);
        reject(error);
      }
    });

    xhr.addEventListener("error", async () => {
      await releaseWakeLock();

      const error = new Error("Network error during upload");

      // Try background sync if supported and upload didn't start
      if (shouldTryBackgroundSync && isBackgroundSyncSupported()) {
        console.log("[Upload] Network error - attempting background sync");
        const syncRegistered = await registerBackgroundSync(uploadId);

        if (syncRegistered) {
          resolve({
            success: false,
            backgroundSync: true,
            uploadId,
            message:
              "Upload will continue in background when connection is restored",
          });
          return;
        }
      }

      onError?.(error);
      reject(error);
    });

    xhr.addEventListener("abort", async () => {
      await releaseWakeLock();

      // Clean up IndexedDB on abort
      try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.delete(uploadId);
      } catch (e) {
        console.warn("[Upload] Failed to clean up IndexedDB on abort:", e);
      }

      reject(new DOMException("Cancelled", "AbortError"));
    });

    xhr.open("POST", "/submit");
    xhr.send(formData);

    // Return xhr for potential cancellation
    resolve.__xhr = xhr;
  });
}

// Check for pending uploads (for recovery on app restart)
export async function getPendingUploads() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  } catch (e) {
    console.warn("[Upload] Failed to get pending uploads:", e);
    return [];
  }
}

// Clear old pending uploads (older than 24 hours)
export async function clearOldPendingUploads() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const uploads = request.result || [];
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      uploads.forEach((upload) => {
        if (now - upload.timestamp > maxAge) {
          store.delete(upload.id);
          console.log("[Upload] Cleared old pending upload:", upload.id);
        }
      });
    };
  } catch (e) {
    console.warn("[Upload] Failed to clear old pending uploads:", e);
  }
}

// Detect if running on mobile
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Get upload capability status
export function getUploadCapabilities() {
  return {
    serviceWorker: "serviceWorker" in navigator,
    backgroundSync: isBackgroundSyncSupported(),
    wakeLock: isWakeLockSupported(),
    indexedDB: "indexedDB" in window,
    isMobile: isMobileDevice(),
  };
}
