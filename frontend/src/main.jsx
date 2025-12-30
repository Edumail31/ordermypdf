import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { 
  registerServiceWorker, 
  setupWakeLockReacquisition, 
  clearOldPendingUploads,
  getUploadCapabilities 
} from "./backgroundUpload";

// Initialize background upload support
async function initBackgroundUpload() {
  try {
    // Register service worker for background sync
    await registerServiceWorker();
    
    // Set up wake lock re-acquisition when page becomes visible
    setupWakeLockReacquisition();
    
    // Clean up old pending uploads
    await clearOldPendingUploads();
    
    // Log capabilities for debugging
    const capabilities = getUploadCapabilities();
    console.log('[App] Upload capabilities:', capabilities);
    
    if (capabilities.isMobile) {
      if (capabilities.wakeLock) {
        console.log('[App] ✓ Wake Lock supported - uploads will keep screen active');
      }
      if (capabilities.backgroundSync) {
        console.log('[App] ✓ Background Sync supported - uploads can resume if interrupted');
      }
    }
  } catch (error) {
    console.warn('[App] Background upload initialization error:', error);
  }
}

// Initialize on load
initBackgroundUpload();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
