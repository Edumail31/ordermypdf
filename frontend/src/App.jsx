import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";

// Simple mobile detection
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Simple wake lock helper
async function requestWakeLock() {
  if ("wakeLock" in navigator) {
    try {
      return await navigator.wakeLock.request("screen");
    } catch (e) {
      console.log("Wake lock not available:", e);
      return null;
    }
  }
  return null;
}

async function releaseWakeLock(lock) {
  if (lock) {
    try {
      await lock.release();
    } catch (e) {
      // Ignore
    }
  }
}

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

// Lightweight inline SVG icons - Lucide-inspired professional design
const Icons = {
  pdf: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 3v5a1 1 0 001 1h5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-6 4h4" />
    </svg>
  ),
  bolt: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
  robot: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="5" r="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v4M8 15h.01M16 15h.01"/>
    </svg>
  ),
  shield: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  ),
  copy: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <rect x="9" y="9" width="13" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  ),
  spinner: (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
  circle: (
    <svg className="w-2 h-2" viewBox="0 0 8 8">
      <circle cx="4" cy="4" r="3" fill="currentColor" />
    </svg>
  ),
  check: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  folder: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  file: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
      <polyline strokeLinecap="round" strokeLinejoin="round" points="14 2 14 8 20 8" />
    </svg>
  ),
  play: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <polygon strokeLinecap="round" strokeLinejoin="round" points="6 3 20 12 6 21 6 3" />
    </svg>
  ),
  download: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
    </svg>
  ),
  lightbulb: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26A7 7 0 0012 2z" />
    </svg>
  ),
  wand: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 11.8L11 13M12.2 6.2L11 5M15 9a3 3 0 11-6 0 3 3 0 016 0zM3 21l9-9" />
    </svg>
  ),
  arrow: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
  signal: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 20v-6M10 20v-9M14 20V10M18 20V4" />
    </svg>
  ),
  export: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  ),
  stop: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  clipboard: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  minus: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
  ),
  error: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4M12 16h.01" />
    </svg>
  ),
  question: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
    </svg>
  ),
  checkCircle: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  ),
  upload: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  ),
  cog: (
    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getOrCreateSessionId() {
  try {
    const key = "ordermypdf_session_id";
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const id = `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(key, id);
    return id;
  } catch {
    return `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

// Job persistence helpers for recovery after page refresh/close
const JOB_STORAGE_KEY = "ordermypdf_pending_job";

function savePendingJob(jobId, prompt, fileName, estTime) {
  try {
    const data = { jobId, prompt, fileName, estTime, startedAt: Date.now() };
    window.localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.log("Could not save job to localStorage", e);
  }
}

function loadPendingJob() {
  try {
    const raw = window.localStorage.getItem(JOB_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Expire jobs after 30 minutes (same as server)
    if (Date.now() - data.startedAt > 30 * 60 * 1000) {
      clearPendingJob();
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
}

function clearPendingJob() {
  try {
    window.localStorage.removeItem(JOB_STORAGE_KEY);
  } catch (e) {
    // Ignore
  }
}

function inferDownloadLabel(result) {
  if (!result?.output_file) return "Download";
  const lower = String(result.output_file).toLowerCase();
  if (lower.endsWith(".docx")) return "Download Converted DOCX";

  switch (result.operation) {
    case "merge":
      return "Download Merged PDF";
    case "split":
      return "Download Extracted PDF";
    case "delete":
      return "Download Updated PDF";
    case "compress":
    case "compress_to_target":
      return "Download Compressed PDF";
    case "pdf_to_docx":
      return "Download Converted DOCX";
    case "multi":
      return "Download Result";
    default:
      return "Download Result";
  }
}

// Calculate total file size in MB
function getTotalFileSizeMB(files) {
  if (!files || files.length === 0) return 0;
  return files.reduce((sum, f) => sum + (f.size || 0), 0) / (1024 * 1024);
}

// Estimate wait time based on file size and operation (processing only, not upload)
function estimateWaitTime(sizeMB, prompt) {
  const lower = (prompt || "").toLowerCase();

  // Base processing time (server-side, after upload completes)
  // These are calibrated based on actual Render server performance
  let baseSeconds;

  // OCR is CPU-intensive
  if (/ocr/i.test(lower)) {
    baseSeconds = 10 + sizeMB * 0.5; // ~10s base + 0.5s per MB
  }
  // PDF to DOCX conversion
  else if (/docx|word/i.test(lower)) {
    baseSeconds = 8 + sizeMB * 0.4;
  }
  // Compression with target
  else if (/compress/i.test(lower)) {
    // Iterative compression is slower for large files
    if (sizeMB > 50) {
      baseSeconds = 15 + sizeMB * 0.3;
    } else {
      baseSeconds = 8 + sizeMB * 0.25;
    }
  }
  // PDF to images
  else if (/png|jpg|jpeg|image/i.test(lower)) {
    baseSeconds = 5 + sizeMB * 0.3;
  }
  // Simple operations (merge, split, rotate, etc.)
  else {
    baseSeconds = 3 + sizeMB * 0.1;
  }

  // Add AI parsing overhead (~2-3 seconds)
  baseSeconds += 3;

  // Round to reasonable display
  const seconds = Math.max(5, Math.round(baseSeconds));

  if (seconds < 60) return `~${seconds}s`;
  if (seconds < 120) return "~1 min";
  const mins = Math.round(seconds / 60);
  return `~${mins} mins`;
}

// Check if prompt has specific compression target
function hasSpecificCompressionTarget(prompt) {
  const lower = (prompt || "").toLowerCase();
  // Specific MB target: "compress to 5mb", "2mb"
  if (/\d+\s*mb/i.test(lower)) return true;
  // Percentage: "by 50%", "compress 30%"
  if (/\d+\s*%/.test(lower)) return true;
  // Fractions: "by half", "quarter", "third"
  if (/\b(half|quarter|third)\b/i.test(lower)) return true;
  // Qualitative with specific intent: "very tiny", "smallest", "maximum"
  if (/\b(very tiny|smallest|maximum|minimal)\b/i.test(lower)) return true;
  return false;
}

// Check if this is a plain compress command without target
function isPlainCompress(prompt) {
  const lower = (prompt || "").toLowerCase().trim();
  // Matches: "compress", "compress it", "compress this", "compress pdf", "compress this pdf"
  return /^compress(\s+(it|this|pdf|this pdf|the pdf))?$/i.test(lower);
}

function looksLikeClarification(msg) {
  if (!msg) return false;
  const s = String(msg).trim();
  if (!s) return false;
  return s.endsWith("?") || /^how\b|^which\b|^what\b|^would you\b/i.test(s);
}

function isNonEmptyArray(v) {
  return Array.isArray(v) && v.length > 0;
}

function normalizeWhitespace(s) {
  return String(s || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompressTargetLanguage(text) {
  // UI-only normalization to match backend parsing.
  // Examples:
  // - "by 2mb" -> "to 2mb"
  // - "2 mb" -> "2mb"
  const t = normalizeWhitespace(text);
  return t
    .replace(/\bby\s*(\d+)\s*mb\b/i, "to $1mb")
    .replace(/\bunder\s*(\d+)\s*mb\b/i, "to $1mb")
    .replace(/\b(\d+)\s*mb\b/gi, "$1mb");
}

function levenshtein(a, b) {
  const s = String(a || "");
  const t = String(b || "");
  const m = s.length;
  const n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j += 1) prev[j] = j;

  for (let i = 1; i <= m; i += 1) {
    curr[0] = i;
    const si = s.charCodeAt(i - 1);
    for (let j = 1; j <= n; j += 1) {
      const cost = si === t.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j += 1) prev[j] = curr[j];
  }
  return prev[n];
}

const OP_KEYWORDS = [
  "compress",
  "merge",
  "split",
  "extract",
  "keep",
  "delete",
  "remove",
  "convert",
  "docx",
  "word",
  "pages",
  "page",
  "then",
  "and",
  "after",
  "before",
  "to",
  "under",
  "mb",
];

function fixCommonTypos(text) {
  const t = normalizeWhitespace(text);
  return t
    .replace(/\bcom+res+s*\b/gi, "compress")
    .replace(/\bcompres+s*\b/gi, "compress")
    .replace(/\bcomprss\b/gi, "compress")
    .replace(/\bspl+it\b/gi, "split")
    .replace(/\bspl+it+\b/gi, "split")
    .replace(/\bmerg(e)?\b/gi, "merge")
    .replace(/\bdel+ete\b/gi, "delete")
    .replace(/\bremvoe\b/gi, "remove")
    .replace(/\bconver+t\b/gi, "convert")
    .replace(/\bdoc\s*x\b/gi, "docx");
}

function normalizePromptForSend(text) {
  // Frontend-only “advanced” typo tolerance.
  // We correct obvious typos for known operation keywords to increase parse success.
  const base = fixCommonTypos(normalizeCompressTargetLanguage(text));

  const threshold = 0.74; // conservative enough for ops, but catches "comres" -> "compress"
  return base.replace(/[A-Za-z]{3,}/g, (word) => {
    const w = word.toLowerCase();
    if (OP_KEYWORDS.includes(w)) return word;
    if (w.length < 4) return word;

    let best = null;
    let bestScore = 0;
    for (const k of OP_KEYWORDS) {
      const dist = levenshtein(w, k);
      const score = 1 - dist / Math.max(w.length, k.length);
      if (score > bestScore) {
        bestScore = score;
        best = k;
      }
    }

    // Extra safety: only correct to actual operation-ish keywords
    if (best && bestScore >= threshold) {
      return best;
    }
    return word;
  });
}

function formatRemainingSeconds(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (!Number.isFinite(s) || s <= 0) return "";
  if (s < 60) return `~${s}s`;
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  if (mins < 60) return rem ? `~${mins}m ${rem}s` : `~${mins}m`;
  const hrs = Math.floor(mins / 60);
  const m2 = mins % 60;
  return m2 ? `~${hrs}h ${m2}m` : `~${hrs}h`;
}

function buildProcessingText(msg, estimatedRemainingSeconds, status) {
  const base = String(msg || "Processing...").trim() || "Processing...";
  const eta = formatRemainingSeconds(estimatedRemainingSeconds);
  if (!eta) {
    if (status === "pending") return `${base} (queueing...)`;
    return base;
  }
  return `${base} (ETA ${eta})`;
}

function inferClarificationKind(question) {
  const q = String(question || "").toLowerCase();
  if (q.includes("rotate") && q.includes("degree")) return "rotate_degrees";
  if (
    q.includes("compress") &&
    (q.includes("mb") || q.includes("size") || q.includes("specific"))
  ) {
    return "compress";
  }
  if (q.includes("keep") && q.includes("pages")) return "keep_pages";
  if (q.includes("delete") && q.includes("pages")) return "delete_pages";
  if (q.includes("which pages")) return "keep_pages";
  if (q.includes("which page")) return "keep_pages";
  return "freeform";
}

function buildClarifiedPrompt({ baseInstruction, question, userReply }) {
  const kind = inferClarificationKind(question);
  const reply = normalizeCompressTargetLanguage(userReply);
  const base = normalizeWhitespace(baseInstruction);

  if (kind === "rotate_degrees") {
    const r = normalizeWhitespace(userReply).toLowerCase();
    // Numeric-only replies are extremely common.
    const num = r.match(/^(-?\d+)\s*(deg|degree|degrees)?$/i);
    if (num) return `rotate ${num[1]} degrees`;
    if (/\bleft\b/.test(r)) return "rotate left";
    if (/\bright\b/.test(r)) return "rotate right";
    if (/\bflip\b/.test(r)) return "rotate 180 degrees";
    // Fall back to combining.
    return normalizeWhitespace(`${base} ${reply}`);
  }

  if (kind === "compress") {
    // If they replied just "2mb" or "to 2mb", generate a clean instruction.
    const mb = reply.match(/\b(\d+)mb\b/i);
    if (mb) return `compress to ${mb[1]}mb`;

    // Qualitative replies: "a little", "very tiny" etc.
    if (
      /\b(little|slight|tiny|smallest|maximum|strong|best quality|minimal compression)\b/i.test(
        reply
      )
    ) {
      return `compress ${reply}`;
    }

    // Percent-based replies: "50%" etc.
    if (/%/.test(reply)) return `compress by ${reply.replace(/[^0-9%]/g, "")}`;

    // Otherwise, combine.
    return normalizeWhitespace(`${base} ${reply}`);
  }

  if (kind === "keep_pages") {
    if (/\bpage\b|\bpages\b/i.test(reply)) return reply;
    return `keep pages ${reply}`;
  }

  if (kind === "delete_pages") {
    if (/\bdelete\b|\bremove\b/i.test(reply)) return reply;
    return `delete pages ${reply}`;
  }

  return normalizeWhitespace(`${base} ${reply}`);
}

function applyHumanDefaults(text) {
  const t = normalizeWhitespace(text);
  const lower = t.toLowerCase();

  // File-type only prompts (very common): execute directly.
  if (/^(png|jpg|jpeg)$/i.test(lower)) return `export pages as ${lower} images`;
  if (/^(docx|word)$/i.test(lower)) return "convert to docx";
  if (/^txt$/i.test(lower)) return "extract text";
  if (/^ocr$/i.test(lower)) return "ocr this";

  // Rotate without degrees: default to 90.
  if (
    /(\brotate\b|\bturn\b|\bmake it straight\b)/i.test(lower) &&
    !/(-?\d+)/.test(lower)
  ) {
    return `${t} 90 degrees`;
  }
  // Common rotate aliases.
  if (/\bflip\b/i.test(lower)) return "rotate 180 degrees";
  if (/\brotate\s+left\b/i.test(lower)) return "rotate -90 degrees";
  if (/\brotate\s+right\b/i.test(lower)) return "rotate 90 degrees";

  return t;
}

export default function App() {
  const fileInputRef = useRef(null);
  const promptRef = useRef(null);
  const chatEndRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [lastFileName, setLastFileName] = useState("");

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [clarification, setClarification] = useState("");
  const [pendingClarification, setPendingClarification] = useState(null);
  const [messages, setMessages] = useState(() => [
    {
      id: makeId(),
      role: "agent",
      tone: "neutral",
      text: "Upload your files, then tell me what to do — I can merge, split, compress, OCR, convert, and clean up PDFs.",
    },
  ]);

  const sessionIdRef = useRef(getOrCreateSessionId());
  const abortControllerRef = useRef(null);
  const wakeLockRef = useRef(null);

  const [toast, setToast] = useState(null);
  const [downloadBlink, setDownloadBlink] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100 for upload phase
  const [isUploading, setIsUploading] = useState(false); // true during upload, false during processing
  const [processingMessage, setProcessingMessage] = useState("");
  const currentJobIdRef = useRef(null);
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState("");
  const [fileAttention, setFileAttention] = useState(false);
  const [ramStats, setRamStats] = useState(null);

  // Track uploaded files to avoid re-uploading
  const [uploadedFileNames, setUploadedFileNames] = useState([]); // file names on server
  const [lastUploadedFiles, setLastUploadedFiles] = useState([]); // File objects that were uploaded

  const statusPhrases = useMemo(
    () => [
      "🤖 Analyzing your request…",
      "📄 Preparing PDF operations…",
      "⚙️ Processing files securely…",
      "🧠 Planning steps…",
      "✨ Finalizing output…",
    ],
    []
  );

  const promptSuggestions = useMemo(
    () => [
      "compress to 5MB",
      "merge all PDFs",
      "delete pages 3-5",
      "convert to Word",
      "convert this DOCX to PDF",
      "extract first 10 pages",
      "rotate all pages 90°",
      "OCR this scanned doc",
      "remove blank pages",
      "remove duplicate pages",
      "enhance scan (make it clearer)",
      "flatten PDF",
      "add page numbers",
      "export as PNG images",
      "compress then split page 1",
      "watermark DRAFT on all",
      "JPG to PDF",
    ],
    []
  );

  const [statusIndex, setStatusIndex] = useState(0);
  const [recoveredJob, setRecoveredJob] = useState(null);

  // Fetch RAM stats on mount and periodically
  useEffect(() => {
    let interval = null;
    let retryCount = 0;
    const maxRetries = 3;

    const fetchRam = async () => {
      try {
        const res = await fetch("/api/ram");
        if (res.ok) {
          const data = await res.json();
          console.log("[RAM] Fetched:", data);
          // Only set if we got useful data
          if (data && (data.rss_mb || data.peak_rss_mb || data.level)) {
            setRamStats(data);
            retryCount = 0; // Reset retry count on success
          } else {
            console.warn("[RAM] Got empty/incomplete data:", data);
            // Retry a few times on initial load
            if (retryCount < maxRetries) {
              retryCount++;
              setTimeout(fetchRam, 2000);
            }
          }
        } else {
          console.warn("[RAM] Non-OK response:", res.status);
        }
      } catch (e) {
        console.warn("[RAM] Failed to fetch:", e);
        // Retry on error during initial load
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(fetchRam, 2000);
        }
      }
    };

    // Initial fetch with slight delay to let backend warm up
    setTimeout(fetchRam, 500);

    // Poll every 15 seconds (always, not just when idle)
    interval = setInterval(fetchRam, 15000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []); // Remove loading dependency so it always polls

  // Check for pending job on mount (recovery after page refresh)
  useEffect(() => {
    const pending = loadPendingJob();
    if (!pending) return;

    setRecoveredJob(pending);

    // Show recovery message
    setMessages((prev) => [
      ...prev,
      {
        id: makeId(),
        role: "agent",
        tone: "neutral",
        text: `🔄 Found a pending job from earlier. Checking status...`,
      },
    ]);

    // Resume polling for this job
    resumePendingJob(pending);
  }, []);

  // Resume polling for a recovered job
  const resumePendingJob = async (pending) => {
    const { jobId, prompt, fileName } = pending;

    setLoading(true);
    setIsUploading(false);
    setProcessingMessage("Checking job status...");
    currentJobIdRef.current = jobId;
    abortControllerRef.current = new AbortController();

    setMessages((prev) => [
      ...prev,
      {
        id: makeId(),
        role: "agent",
        tone: "status",
        text: `Resuming: ${prompt || fileName}...`,
      },
    ]);

    try {
      let completed = false;
      let pollCount = 0;
      const maxPolls = 600; // 10 minutes at 1 second intervals

      while (!completed && pollCount < maxPolls) {
        if (abortControllerRef.current?.signal.aborted) {
          throw new DOMException("Cancelled", "AbortError");
        }

        await new Promise((resolve) => setTimeout(resolve, 1000)); // Poll every 1 second
        pollCount++;

        const statusRes = await fetch(`/job/${jobId}/status`, {
          signal: abortControllerRef.current?.signal,
        });

        if (statusRes.status === 404) {
          // Job expired or doesn't exist
          clearPendingJob();
          setLoading(false);
          setRecoveredJob(null);
          setMessages((prev) => {
            const trimmed = prev.filter((m) => m.tone !== "status");
            return [
              ...trimmed,
              {
                id: makeId(),
                role: "agent",
                tone: "neutral",
                text: "Previous job expired. Please upload your file and try again.",
              },
            ];
          });
          return;
        }

        if (!statusRes.ok) {
          throw new Error(`Status check failed: ${statusRes.status}`);
        }

        const statusData = await statusRes.json();
        const msg = statusData.message || "Processing...";

        updateRamFromStatus(statusData);
        const statusText = buildProcessingText(
          msg,
          statusData.estimated_remaining,
          statusData.status
        );
        setProcessingMessage(statusText);
        if (statusData.ram) {
          console.log("[RAM DEBUG] Status RAM data:", statusData.ram);
          setRamStats(statusData.ram);
        } else {
          console.warn("[RAM DEBUG] No ram field in statusData");
          // Don't clear ramStats here - periodic fetch will update it
        }

        setMessages((prev) => {
          const trimmed = prev.filter((m) => m.tone !== "status");
          return [
            ...trimmed,
            {
              id: makeId(),
              role: "agent",
              tone: "status",
              text: statusText,
            },
          ];
        });

        if (
          statusData.status === "completed" ||
          statusData.status === "failed"
        ) {
          completed = true;
          currentJobIdRef.current = null;
          clearPendingJob();
          setRecoveredJob(null);

          setMessages((prev) => prev.filter((m) => m.tone !== "status"));

          const resultData = statusData.result;

          if (resultData?.status === "success") {
            setResult({
              status: "success",
              output_file: resultData.output_file,
              message: resultData.message,
              operation: resultData.operation,
            });
            setProcessingMessage("Complete!");
            setDownloadBlink(true);
            setTimeout(() => setDownloadBlink(false), 1600);
            setMessages((prev) => [
              ...prev,
              {
                id: makeId(),
                role: "agent",
                tone: "success",
                text: resultData.message || "Done! Your file is ready.",
              },
            ]);
          } else {
            const msg = resultData?.message || "Processing failed";
            setError(msg);
            setMessages((prev) => [
              ...prev,
              { id: makeId(), role: "agent", tone: "error", text: msg },
            ]);
          }
        } else if (statusData.status === "cancelled") {
          completed = true;
          currentJobIdRef.current = null;
          clearPendingJob();
          setRecoveredJob(null);
        }
      }

      if (!completed) {
        clearPendingJob();
        throw new Error("Job timed out.");
      }
    } catch (err) {
      currentJobIdRef.current = null;
      setProcessingMessage("");
      clearPendingJob();
      setRecoveredJob(null);

      if (err?.name !== "AbortError") {
        const msg = `Failed to resume job: ${err?.message || err}`;
        setError(msg);
        setMessages((prev) => {
          const trimmed = prev.filter((m) => m.tone !== "status");
          return [
            ...trimmed,
            { id: makeId(), role: "agent", tone: "error", text: msg },
          ];
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Subtle cursor glow for "premium" depth.
    let raf = 0;
    const onMove = (e) => {
      const x = e?.clientX ?? 0;
      const y = e?.clientY ?? 0;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const root = document.documentElement;
        root.style.setProperty("--mx", `${x}px`);
        root.style.setProperty("--my", `${y}px`);
      });
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(
      () => setStatusIndex((i) => (i + 1) % statusPhrases.length),
      2200
    );
    return () => clearInterval(t);
  }, [loading, statusPhrases.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, result, error, clarification]);

  // Wake Lock: Keep screen awake during processing (mobile)
  useEffect(() => {
    const requestWakeLock = async () => {
      if (loading && "wakeLock" in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        } catch (err) {
          // Wake lock request failed - not critical
          console.log("Wake lock not available:", err);
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        } catch (err) {
          // Ignore release errors
        }
      }
    };

    if (loading) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [loading]);

  // Warn user if they try to leave/switch tabs during processing
  useEffect(() => {
    if (!loading) return;

    const handleVisibilityChange = () => {
      if (document.hidden && loading) {
        // Can't show toast when hidden, but we can set a flag
        // Toast will show when they return
      }
    };

    const handleBeforeUnload = (e) => {
      if (loading) {
        e.preventDefault();
        e.returnValue =
          "Processing is in progress. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [loading]);

  // Check if current files match the last uploaded files
  const canReuseFiles = useCallback(() => {
    if (!uploadedFileNames.length || !lastUploadedFiles.length) return false;
    if (files.length !== lastUploadedFiles.length) return false;

    // Check if all files match by name and size
    return files.every(
      (f, i) =>
        lastUploadedFiles[i] &&
        f.name === lastUploadedFiles[i].name &&
        f.size === lastUploadedFiles[i].size
    );
  }, [files, uploadedFileNames, lastUploadedFiles]);

  // Handle file selection
  const handleFileChange = (e) => {
    const incoming = Array.from(e.target.files || []);

    // Allow re-selecting the same file(s) later.
    try {
      e.target.value = "";
    } catch {
      // ignore
    }

    if (!incoming.length) return;

    // Check for mixed file formats IMMEDIATELY when selecting files
    // Backend supports PDF, images (png/jpg/jpeg), and DOCX
    const getExt = (name) => (name || "").toLowerCase().split(".").pop();
    const getCategory = (ext) => {
      if (ext === "pdf") return "pdf";
      if (["png", "jpg", "jpeg"].includes(ext)) return "image";
      if (ext === "docx") return "docx";
      return "unsupported";
    };

    // Check incoming files for unsupported types first
    const unsupportedFiles = incoming.filter(
      (f) => getCategory(getExt(f.name)) === "unsupported"
    );
    if (unsupportedFiles.length > 0) {
      setToast({
        message: `⚠️ Unsupported file type: ${unsupportedFiles[0].name}. Only PDF, images (PNG/JPG), and DOCX are supported.`,
        exiting: false,
      });
      setTimeout(() => {
        setToast((t) => (t ? { ...t, exiting: true } : null));
        setTimeout(() => setToast(null), 300);
      }, 5000);
      return; // Block unsupported files
    }

    // Check for mixed file formats (different types not allowed together)
    const allFiles = [...files, ...incoming];
    if (allFiles.length > 1) {
      const categories = new Set(
        allFiles.map((f) => getCategory(getExt(f.name)))
      );
      // Remove "unsupported" from categories check since we already blocked those above
      categories.delete("unsupported");
      if (categories.size > 1) {
        setToast({
          message:
            "⚠️ Please upload files of the same type. You can't mix PDFs, images, and DOCX together.",
          exiting: false,
        });
        setTimeout(() => {
          setToast((t) => (t ? { ...t, exiting: true } : null));
          setTimeout(() => setToast(null), 300);
        }, 5000);
        return; // Block mixed formats immediately
      }
    }

    // Deduplicate by name+size to avoid accidental duplicates.
    const keyOf = (f) => `${f?.name || ""}::${f?.size || 0}`;
    const existingKeys = new Set(files.map(keyOf));
    const dedupedIncoming = incoming.filter((f) => !existingKeys.has(keyOf(f)));

    // Enforce max file count (25)
    const MAX_FILES = 25;
    const room = Math.max(0, MAX_FILES - files.length);
    let accepted = dedupedIncoming;
    if (dedupedIncoming.length > room) {
      accepted = dedupedIncoming.slice(0, room);
      showToast("At once only 25 files allowed.", 4500);
    }

    // If no room, keep state unchanged.
    if (!accepted.length) return;

    const next = files.concat(accepted);

    setFiles(next);
    setLastFileName(accepted[accepted.length - 1].name);

    // Check if these are different files - reset uploaded state
    const filesChanged =
      next.length !== lastUploadedFiles.length ||
      next.some(
        (f, i) =>
          !lastUploadedFiles[i] ||
          f.name !== lastUploadedFiles[i].name ||
          f.size !== lastUploadedFiles[i].size
      );

    if (filesChanged) {
      setUploadedFileNames([]);
      setLastUploadedFiles([]);
    }

    // Show warning for large files (50MB+)
    const totalSizeMB = getTotalFileSizeMB(next);
    const maxFileMB = Math.max(
      0,
      ...next.map((f) => (f?.size || 0) / (1024 * 1024))
    );
    if (totalSizeMB > 60 || maxFileMB > 60) {
      showToast(
        `Large upload (${Math.round(
          totalSizeMB
        )}MB total) — upload depends on your network speed.`,
        6000
      );
    } else if (totalSizeMB > 50) {
      showToast(
        `Large upload (${Math.round(
          totalSizeMB
        )}MB total) — expect longer processing time.`,
        5000
      );
    }

    // Clear any attention blink once files are added.
    setFileAttention(false);
  };

  // Show toast notification
  const showToast = (message, duration = 4000) => {
    setToast({ message, exiting: false });
    setTimeout(() => {
      setToast((t) => (t ? { ...t, exiting: true } : null));
      setTimeout(() => setToast(null), 300);
    }, duration);
  };

  // Stop/Cancel the current process
  const stopProcess = async () => {
    // Abort any ongoing XHR upload
    if (abortControllerRef.current?.xhr) {
      abortControllerRef.current.xhr.abort();
      abortControllerRef.current.xhr = null;
    }

    // Cancel the polling abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Try to cancel the job on the server
    if (currentJobIdRef.current) {
      try {
        await fetch(`/job/${currentJobIdRef.current}/cancel`, {
          method: "POST",
        });
      } catch (e) {
        // Ignore cancel errors
      }
      currentJobIdRef.current = null;
    }
    clearPendingJob(); // Clear localStorage when stopped

    setLoading(false);
    setUploadProgress(0);
    setIsUploading(false);
    setProcessingMessage("");
    // RAM stats will be refreshed by periodic fetch
    showToast("⏹️ Process stopped by user.", 3000);
    setMessages((prev) => [
      ...prev.filter((m, idx) => {
        if (idx !== prev.length - 1) return true;
        return !(m.role === "agent" && m.tone === "status");
      }),
      {
        id: makeId(),
        role: "agent",
        tone: "neutral",
        text: "Process cancelled. Ready for your next request.",
      },
    ]);
  };

  const submit = async (overrideText) => {
    if (!files.length) {
      setError("Please upload at least one file.");
      showToast("Please add a file first.", 3500);
      setFileAttention(true);
      setTimeout(() => setFileAttention(false), 1200);
      return;
    }
    const rawInput = normalizeWhitespace(overrideText ?? prompt);
    if (!rawInput.trim()) {
      setError("Please enter an instruction.");
      return;
    }

    const totalSizeMB = getTotalFileSizeMB(files);

    // Calculate estimated processing time (shown after upload completes)
    const estTime = estimateWaitTime(totalSizeMB, rawInput);

    setLoading(true);
    setError("");
    setResult(null);
    setClarification("");
    setDownloadBlink(false);
    setUploadProgress(0);
    setIsUploading(true);
    setProcessingMessage("");
    // Keep existing RAM stats - will be updated by job status polling

    const rawUserText = rawInput;
    setLastSubmittedPrompt(rawUserText);

    // If user clicked a clarification option, treat it as the final instruction.
    const lastMsg = messages[messages.length - 1];
    const clickedKnownOption =
      pendingClarification &&
      lastMsg?.role === "agent" &&
      isNonEmptyArray(lastMsg?.options) &&
      lastMsg.options.includes(rawUserText);

    const inputSource = clickedKnownOption ? "button" : "text";

    // If we're in a clarification flow, transform the reply into a complete instruction.
    const composed = clickedKnownOption
      ? rawUserText
      : pendingClarification
      ? buildClarifiedPrompt({
          baseInstruction: pendingClarification.baseInstruction,
          question: pendingClarification.question,
          userReply: rawUserText,
        })
      : applyHumanDefaults(rawUserText);

    // Auto-apply 25% compression target for plain "compress" commands
    let finalComposed = composed;
    if (
      !clickedKnownOption &&
      isPlainCompress(composed) &&
      !hasSpecificCompressionTarget(composed)
    ) {
      const fileSizeMB = getTotalFileSizeMB(files);
      const targetMB = Math.max(1, Math.round(fileSizeMB * 0.25));
      finalComposed = `compress to ${targetMB}mb`;
    }

    const userText = normalizePromptForSend(finalComposed);

    // Chat-style: clear input immediately after send
    setPrompt("");

    // Simple status message
    // Determine status message based on whether we can reuse files
    const filesCanBeReused = canReuseFiles();
    const getStatusMessage = () => {
      if (filesCanBeReused) {
        return "Starting processing...";
      }
      return isMobileDevice()
        ? "Uploading files... (Keep app open)"
        : "Uploading files...";
    };

    setMessages((prev) => [
      ...prev,
      {
        id: makeId(),
        role: "user",
        tone: "neutral",
        text: pendingClarification ? rawUserText : userText,
      },
      { id: makeId(), role: "agent", tone: "status", text: getStatusMessage() },
    ]);

    try {
      // Create abort controller for polling
      abortControllerRef.current = new AbortController();

      // Request Wake Lock to prevent device sleep
      try {
        wakeLockRef.current = await requestWakeLock();
      } catch (e) {
        // Wake lock not critical
      }

      const updateRamFromStatus = (statusData) => {
        try {
          if (statusData?.ram) {
            console.log("[RAM DEBUG resumePending] RAM data:", statusData.ram);
            setRamStats(statusData.ram);
          } else {
            console.warn(
              "[RAM DEBUG resumePending] No ram field in statusData"
            );
            // Don't clear ramStats - periodic fetch will update it
          }
        } catch {
          // ignore
        }
      };

      let jobId;
      let resultFileNames = [];

      // Check if we can reuse already-uploaded files
      if (filesCanBeReused && uploadedFileNames.length > 0) {
        console.log("[Submit] Reusing uploaded files:", uploadedFileNames);
        setIsUploading(false);

        const formData = new FormData();
        formData.append("file_names", uploadedFileNames.join(","));
        formData.append("prompt", userText);
        if (pendingClarification?.question) {
          formData.append("context_question", pendingClarification.question);
        }
        formData.append("session_id", sessionIdRef.current);
        if (inputSource) formData.append("input_source", inputSource);

        const response = await fetch("/submit-reuse", {
          method: "POST",
          body: formData,
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          // If files not found, fall back to normal upload
          if (response.status === 404) {
            console.log("[Submit] Files expired, re-uploading...");
            setUploadedFileNames([]);
            setLastUploadedFiles([]);
          } else {
            throw new Error(
              errorData.detail || `Server error (${response.status})`
            );
          }
        } else {
          const result = await response.json();
          jobId = result.job_id;
          resultFileNames = result.uploaded_files || uploadedFileNames;
        }
      }

      // If no jobId yet, do normal upload
      if (!jobId) {
        console.log("[Submit] Uploading files...");
        setIsUploading(true);

        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));
        formData.append("prompt", userText);
        if (pendingClarification?.question) {
          formData.append("context_question", pendingClarification.question);
        }
        formData.append("session_id", sessionIdRef.current);
        if (inputSource) formData.append("input_source", inputSource);

        // Upload with progress tracking
        const uploadResult = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.timeout = 600000;

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(percent);
              setMessages((prev) => {
                const trimmed = prev.filter((m, idx) => {
                  if (idx !== prev.length - 1) return true;
                  return !(m.role === "agent" && m.tone === "status");
                });
                return [
                  ...trimmed,
                  {
                    id: makeId(),
                    role: "agent",
                    tone: "status",
                    text: `Uploading... ${percent}%`,
                  },
                ];
              });
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch (e) {
                reject(new Error("Invalid server response"));
              }
            } else if (xhr.status === 0) {
              reject(new Error("Connection lost"));
            } else {
              reject(new Error(`Server error (${xhr.status})`));
            }
          });

          xhr.addEventListener("error", () =>
            reject(new Error("Connection failed"))
          );
          xhr.addEventListener("timeout", () =>
            reject(new Error("Upload timed out"))
          );
          xhr.addEventListener("abort", () =>
            reject(new DOMException("Cancelled", "AbortError"))
          );

          xhr.open("POST", "/submit");
          xhr.send(formData);
          abortControllerRef.current.xhr = xhr;
        });

        jobId = uploadResult.job_id;
        resultFileNames = uploadResult.uploaded_files || [];
        setIsUploading(false);
        setUploadProgress(100);
      }

      // Store uploaded file names for reuse
      if (resultFileNames.length > 0) {
        setUploadedFileNames(resultFileNames);
        setLastUploadedFiles([...files]);
      }

      currentJobIdRef.current = jobId;

      // Save job to localStorage for recovery
      savePendingJob(jobId, userText, files[0]?.name || "file", estTime);

      // Release wake lock
      await releaseWakeLock(wakeLockRef.current);
      wakeLockRef.current = null;
      setProcessingMessage("Processing...");

      // Update status message for processing
      setMessages((prev) => {
        const trimmed = prev.filter((m, idx) => {
          if (idx !== prev.length - 1) return true;
          return !(m.role === "agent" && m.tone === "status");
        });
        return [
          ...trimmed,
          {
            id: makeId(),
            role: "agent",
            tone: "status",
            text: `Processing...`,
          },
        ];
      });

      // Step 2: Poll for status until done
      let completed = false;
      let pollCount = 0;
      const maxPolls = 600; // 10 minutes at 1 second intervals

      while (!completed && pollCount < maxPolls) {
        // Check if cancelled
        if (abortControllerRef.current?.signal.aborted) {
          throw new DOMException("Cancelled", "AbortError");
        }

        await new Promise((resolve) => setTimeout(resolve, 1000)); // Poll every 1 second
        pollCount++;

        const statusRes = await fetch(`/job/${jobId}/status`, {
          signal: abortControllerRef.current?.signal,
        });

        if (!statusRes.ok) {
          throw new Error(`Status check failed: ${statusRes.status}`);
        }

        const statusData = await statusRes.json();
        const msg = statusData.message || "Processing...";

        const statusText = buildProcessingText(
          msg,
          statusData.estimated_remaining,
          statusData.status
        );

        // Update processing message
        setProcessingMessage(statusText);

        // Update the status bubble - simple progress display
        setMessages((prev) => {
          const trimmed = prev.filter((m, idx) => {
            if (idx !== prev.length - 1) return true;
            return !(m.role === "agent" && m.tone === "status");
          });
          return [
            ...trimmed,
            {
              id: makeId(),
              role: "agent",
              tone: "status",
              text: statusText,
            },
          ];
        });

        if (
          statusData.status === "completed" ||
          statusData.status === "failed"
        ) {
          completed = true;
          currentJobIdRef.current = null;
          clearPendingJob(); // Clear localStorage on completion
          // RAM stats will be refreshed by periodic fetch

          // Remove the status bubble
          setMessages((prev) => {
            const trimmed = prev.filter((m, idx) => {
              if (idx !== prev.length - 1) return true;
              return !(m.role === "agent" && m.tone === "status");
            });
            return trimmed;
          });

          const resultData = statusData.result;

          if (resultData?.status === "success") {
            setResult({
              status: "success",
              output_file: resultData.output_file,
              message: resultData.message,
              operation: resultData.operation,
            });
            setPendingClarification(null);
            setClarification("");
            setProcessingMessage("Complete!");
            // Trigger download button blink
            setDownloadBlink(true);
            setTimeout(() => setDownloadBlink(false), 1600);
            setMessages((prev) => [
              ...prev,
              {
                id: makeId(),
                role: "agent",
                tone: "success",
                text: resultData.message || "Done!",
              },
            ]);
          } else {
            // Handle error or clarification
            const msg = resultData?.message || "Unknown error";
            const hasOptions = isNonEmptyArray(resultData?.options);

            if (hasOptions || looksLikeClarification(msg)) {
              setClarification(msg);
              setPendingClarification({
                question: msg,
                baseInstruction: userText,
              });
              setPrompt("");
              setMessages((prev) => [
                ...prev,
                {
                  id: makeId(),
                  role: "agent",
                  tone: "clarify",
                  text: msg,
                  options: resultData?.options,
                },
              ]);
              setTimeout(() => promptRef.current?.focus(), 0);
            } else {
              setError(msg);
              setPendingClarification(null);
              setMessages((prev) => [
                ...prev,
                { id: makeId(), role: "agent", tone: "error", text: msg },
              ]);
            }
          }
        } else if (statusData.status === "cancelled") {
          completed = true;
          currentJobIdRef.current = null;
          clearPendingJob(); // Clear localStorage on cancel
          // RAM stats will be refreshed by periodic fetch
        }
      }

      if (!completed) {
        throw new Error(
          "Processing timed out. Please try again with a smaller file."
        );
      }
    } catch (err) {
      currentJobIdRef.current = null;
      setUploadProgress(0);
      setIsUploading(false);
      setProcessingMessage("");

      const msg =
        err?.name === "AbortError"
          ? "Request cancelled."
          : `Failed: ${err?.message || err}`;

      if (err?.name !== "AbortError") {
        setError(msg);
        setMessages((prev) => {
          const trimmed = prev.filter((m, idx) => {
            if (idx !== prev.length - 1) return true;
            return !(m.role === "agent" && m.tone === "status");
          });
          return [
            ...trimmed,
            { id: makeId(), role: "agent", tone: "error", text: msg },
          ];
        });
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;

      // Release wake lock if still held (error case)
      await releaseWakeLock(wakeLockRef.current);
      wakeLockRef.current = null;
    }
  };

  const handleOptionClick = async (opt) => {
    if (loading) return;
    // Submit immediately with the option text (do not concatenate with prior prompt).
    await submit(opt);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setResult(null);
    await submit();
  };

  const downloadLabel = inferDownloadLabel(result);
  const hasMultiple = files.length > 1;
  const fileBadge = files.length
    ? `${files.length} file${files.length === 1 ? "" : "s"}`
    : "No files";

  const ramIndicator = useMemo(() => {
    const level = (ramStats?.level || "").toLowerCase();
    if (level === "high") return { label: "High", className: "text-rose-400" };
    if (level === "medium")
      return { label: "Medium", className: "text-amber-300" };
    if (level === "low") return { label: "Low", className: "text-green-400" };
    return { label: "—", className: "text-slate-500" };
  }, [ramStats]);

  const ramPillText = useMemo(() => {
    if (!ramStats) return "Loading...";
    const mb = ramStats.rss_mb || ramStats.peak_rss_mb || null;
    if (mb == null) return "—";
    console.log("[RAM] Pill showing:", mb);
    return `RAM ${mb}MB`;
  }, [ramStats]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-sans antialiased">
      <div className="cursor-glow" aria-hidden="true" />

      {/* Toast notification for large files - with glass effect */}
      {toast && (
        <div
          className={cn(
            "fixed top-4 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 z-50 px-4 py-3 rounded-xl max-w-sm mx-auto md:mx-0",
            "glass border-amber-500/20 text-amber-100 shadow-lg",
            toast.exiting ? "toast-exit" : "toast-enter"
          )}
        >
          <div className="flex items-center gap-3 justify-center text-center">
            <span className="text-amber-400 shrink-0">{Icons.clock}</span>
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Subtle ambient background glow */}
      <div className="pointer-events-none fixed inset-0 opacity-50">
        <div className="absolute -top-40 left-1/3 h-96 w-[60rem] -translate-x-1/2 rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10rem] right-[-10rem] h-96 w-96 rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute top-1/2 left-[-10rem] h-64 w-64 rounded-full bg-cyan-500/3 blur-[100px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
        <header className="flex flex-col gap-3">
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white flex items-center gap-3">
              <span className="text-[var(--accent-primary)] drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]">{Icons.pdf}</span>
              <span className="relative">
                <span className="absolute -inset-3 -z-10 rounded-2xl bg-[var(--accent-primary)]/6 blur-2xl" />
                <span className="bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent drop-shadow-sm">
                  OrderMyPDF
                </span>
              </span>
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
              <span className="text-[var(--accent-primary)] mr-1.5 inline-block">
                {Icons.bolt}
              </span>
              Professional document processing — merge, split, compress, OCR, convert, and more. Upload your files and describe what you need.
            </p>
          </div>
        </header>

        <main className="grid gap-6 md:grid-cols-[1fr_18rem] items-start">
          {/* Mobile Session (compact, above console) */}
          <div className="md:hidden w-full">
            <div className="glass-card rounded-2xl p-3 hover-glow transition-all duration-300">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-2">
                    <span className="text-[var(--accent-primary)]">{Icons.clipboard}</span>
                    Session
                  </div>
                  <div className="mt-1 text-[10px] text-[var(--text-muted)] truncate max-w-[10rem]">
                    {files.length
                      ? lastFileName || files[0]?.name
                      : "No files selected"}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                    {fileBadge}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] flex items-center gap-1 transition-colors duration-200",
                      loading
                        ? "border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                        : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                    )}
                  >
                    {loading ? (
                      <>
                        <span className="text-[var(--accent-primary)]">{Icons.spinner}</span>
                        {isUploading ? "Uploading" : "Processing"}
                      </>
                    ) : (
                      <>
                        <span className="text-emerald-400">{Icons.circle}</span>
                        Ready
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Live RAM indicator (mobile) - always visible */}
              <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                <span className={cn(ramIndicator.className)}>
                  {Icons.circle}
                </span>
                <span className="text-[var(--text-primary)]">RAM</span>
                <span className="text-[var(--text-muted)]">
                  {ramStats
                    ? `${ramStats.rss_mb || ramStats.peak_rss_mb || "—"}MB`
                    : "Loading..."}
                </span>
              </div>
            </div>
          </div>

          <section className="glass-card rounded-2xl border border-[var(--glass-border)] shadow-[var(--shadow-card)] w-full max-w-[95vw] md:max-w-none transition-all duration-300 hover:shadow-[var(--shadow-glow)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--glass-border)] px-5 py-4 md:px-6">
              <div className="space-y-1">
                <div className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                  <span className="text-[var(--accent-primary)] drop-shadow-[0_0_6px_rgba(59,130,246,0.5)]">{Icons.robot}</span>
                  Agent Console
                </div>
                <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                  <span className="text-[var(--text-muted)]">{Icons.shield}</span>
                  Files processed securely, never stored
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <span className="glass-subtle rounded-full px-3 py-1 text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 hover-scale cursor-default">
                  <span className="text-[var(--text-muted)]">{Icons.copy}</span>
                  {fileBadge}
                </span>

                {/* RAM pill - always visible */}
                <span className="glass-subtle rounded-full px-3 py-1 text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 hover-scale cursor-default">
                  <span className={cn(ramIndicator.className)}>
                    {Icons.circle}
                  </span>
                  <span className="text-[var(--text-primary)]">{ramPillText}</span>
                </span>

                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] flex items-center gap-1.5 transition-colors duration-200",
                    loading
                      ? "border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                      : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                  )}
                >
                  {loading ? (
                    <>
                      <span className="text-[var(--accent-primary)]">{Icons.spinner}</span>
                      Working…
                    </>
                  ) : (
                    <>
                      <span className="text-emerald-400">{Icons.circle}</span>
                      Ready
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="h-[20rem] overflow-auto px-5 py-4 md:h-[24rem] md:px-6">
              <div className="space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex w-full animate-fade-slide",
                      m.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[90%] rounded-xl border px-4 py-3 text-sm leading-relaxed transition-all duration-200 backdrop-blur-sm",
                        m.role === "user"
                          ? "border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/8 text-[var(--text-primary)] hover:shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                          : "border-[var(--glass-border)] bg-[var(--bg-elevated)]/80 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]",
                        m.tone === "success" &&
                          "border-emerald-500/25 bg-emerald-500/8 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]",
                        m.tone === "error" &&
                          "border-rose-500/25 bg-rose-500/8 hover:shadow-[0_0_15px_rgba(244,63,94,0.1)]",
                        m.tone === "clarify" &&
                          "border-amber-500/25 bg-amber-500/8 hover:shadow-[0_0_15px_rgba(251,191,36,0.1)]",
                        m.tone === "status" && "border-[var(--accent-primary)]/15 bg-[var(--bg-elevated)]/80"
                      )}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="whitespace-pre-wrap">{m.text}</div>
                          {m.role === "agent" && m.tone === "status" ? (
                            <div className="mt-0.5 inline-flex items-center gap-1.5 text-[var(--accent-primary)]">
                              {Icons.spinner}
                            </div>
                          ) : null}
                        </div>

                        {m.options && m.options.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-2">
                            {m.options.map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleOptionClick(opt)}
                                className={cn(
                                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 hover-scale",
                                  "border-amber-500/25 bg-amber-500/8 text-amber-100 hover:bg-amber-500/15",
                                  "active:scale-[0.98] flex items-center gap-1.5"
                                )}
                              >
                                <span className="text-amber-400/70">
                                  {Icons.arrow}
                                </span>
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {loading ? (
                  <div className="flex w-full justify-start animate-fade-slide">
                    <div className="max-w-[90%] rounded-xl border border-[var(--accent-primary)]/15 bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)]">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[var(--accent-primary)]">{Icons.cog}</span>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">
                              {isUploading
                                ? `Uploading... ${uploadProgress}%`
                                : processingMessage ||
                                  "Processing your request..."}
                            </span>
                          </div>
                        </div>
                        {/* Progress bar only during upload */}
                        {isUploading && (
                          <>
                            <div className="w-full bg-[var(--bg-base)] rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">
                              Upload speed depends on your network connection
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
                <div ref={chatEndRef} />
              </div>
            </div>

            <div className="border-t border-[var(--border-subtle)] px-5 py-4 md:px-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "group inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200",
                        "glass-subtle hover:bg-[var(--bg-surface)] hover:border-[var(--accent-primary)]/30 hover-lift",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50",
                        fileAttention &&
                          "ring-2 ring-amber-400/50 animate-pulse"
                      )}
                    >
                      <span className="text-[var(--accent-primary)]/80 group-hover:text-[var(--accent-primary)] transition-colors">{Icons.folder}</span>
                      <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">Choose files</span>
                      {files.length ? (
                        <span className="ml-1 inline-flex items-center justify-center rounded-full border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 px-2 py-0.5 text-[11px] text-[var(--accent-primary)]">
                          +
                        </span>
                      ) : null}
                    </button>

                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[10px] md:text-[11px] text-[var(--text-secondary)] shrink-0">
                          <span className="text-[var(--text-muted)]">{Icons.file}</span>
                          {hasMultiple ? "Multiple" : "File"}
                        </span>
                        {files.length ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 px-2.5 py-1 text-[10px] md:text-[11px] text-[var(--accent-primary)] animate-chip-in min-w-0">
                            <span className="text-[var(--accent-primary)] shrink-0">
                              {Icons.checkCircle}
                            </span>
                            <span className="truncate max-w-[8rem] md:max-w-[14rem]">
                              {lastFileName || files[0]?.name}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[10px] md:text-xs text-[var(--text-muted)]">
                            No file selected
                          </span>
                        )}
                      </div>
                      {files.length ? (
                        <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                          {hasMultiple
                            ? "Processing all files."
                            : "Ready to process."}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="hidden md:flex flex-col items-stretch gap-2 md:items-end">
                    {/* Desktop Run/Stop buttons */}
                    <div className="flex gap-2">
                      {loading ? (
                        <button
                          type="button"
                          onClick={stopProcess}
                          className={cn(
                            "relative inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200",
                            "border border-rose-500/30 bg-rose-500/15 text-rose-100 hover-lift",
                            "hover:bg-rose-500/25 hover:border-rose-400/50 hover:shadow-[0_0_20px_rgba(244,63,94,0.2)]",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50"
                          )}
                        >
                          {Icons.stop}
                          Stop
                        </button>
                      ) : (
                        <button
                          type="submit"
                          className={cn(
                            "relative inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 btn-shine",
                            "border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/12 text-[var(--text-primary)] hover-lift",
                            "hover:bg-[var(--accent-primary)]/18 hover:border-[var(--accent-primary)]/35",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                          )}
                        >
                          {Icons.play}
                          Run
                        </button>
                      )}
                    </div>

                    <div className="w-full md:w-[16rem]">
                      <div className="glass-subtle rounded-xl p-3 hover:shadow-[var(--shadow-glow)] transition-all duration-300">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-[11px] font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                            <span className="text-amber-400/70 drop-shadow-[0_0_4px_rgba(251,191,36,0.3)]">
                              {Icons.lightbulb}
                            </span>
                            Ideas
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            tap to use
                          </div>
                        </div>

                        <div className="relative h-28 overflow-hidden rounded-lg border border-[var(--glass-border)] bg-[var(--bg-base)]/50 backdrop-blur-sm">
                          <ul className="suggestion-loop">
                            {promptSuggestions
                              .concat(promptSuggestions)
                              .map((s, idx) => (
                                <li
                                  key={`${s}_${idx}`}
                                  className="suggestion-item"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPrompt(s);
                                      setTimeout(
                                        () => promptRef.current?.focus(),
                                        0
                                      );
                                    }}
                                    className="w-full rounded-lg px-3 py-1.5 text-left text-sm text-[var(--text-secondary)] transition-all duration-200 hover:bg-[var(--accent-primary)]/10 hover:text-[var(--text-primary)] hover:translate-x-1 focus:outline-none"
                                  >
                                    {s}
                                  </button>
                                </li>
                              ))}
                          </ul>
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[var(--bg-base)]/90 to-transparent" />
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[var(--bg-base)]/90 to-transparent" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div
                    className={cn(
                      "glass-subtle rounded-xl transition-all duration-200 hover:shadow-[var(--shadow-glow)]",
                      clarification
                        ? "border border-amber-500/25 shadow-[0_0_15px_rgba(251,191,36,0.1)]"
                        : "border border-[var(--glass-border)]"
                    )}
                  >
                    <div className="flex items-start gap-3 p-3">
                      <div className="mt-1 h-8 w-8 shrink-0 rounded-lg border border-[var(--glass-border)] bg-[var(--bg-surface)]/50 backdrop-blur-sm flex items-center justify-center text-[var(--accent-primary)]/70">
                        {Icons.wand}
                      </div>
                      <div className="flex-1">
                        <textarea
                          ref={promptRef}
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              if (!loading) {
                                handleSubmit({ preventDefault: () => {} });
                              }
                            }
                          }}
                          placeholder={
                            clarification
                              ? "Reply with details so I can continue…"
                              : "Describe your task, e.g. 'merge these PDFs and compress to 5MB'"
                          }
                          rows={2}
                          className={cn(
                            "w-full resize-none bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                            "focus:outline-none"
                          )}
                        />
                        <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                          <span>
                            {clarification
                              ? "Clarification needed — keep it conversational."
                              : "Use 'then' to chain operations"}
                          </span>
                          <span className="text-[var(--text-muted)]">
                            Enter to send • Shift+Enter newline
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile buttons row - Run/Stop and Download side by side */}
                <div className="flex md:hidden gap-3">
                  {loading ? (
                    <button
                      type="button"
                      onClick={stopProcess}
                      className={cn(
                        "flex-1 relative inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover-lift",
                        "border border-rose-500/30 bg-rose-500/15 text-rose-100",
                        "hover:bg-rose-500/25 hover:border-rose-400/50 hover:shadow-[0_0_20px_rgba(244,63,94,0.2)]",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50"
                      )}
                    >
                      {Icons.stop}
                      Stop
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className={cn(
                        "flex-1 relative inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 btn-shine hover-lift",
                        "border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/12 text-[var(--text-primary)]",
                        "hover:bg-[var(--accent-primary)]/18 hover:border-[var(--accent-primary)]/40 hover:shadow-[var(--shadow-glow)]",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                      )}
                    >
                      {Icons.play}
                      Run
                    </button>
                  )}

                  <a
                    href={
                      result?.output_file
                        ? `/download/${result.output_file}`
                        : "#"
                    }
                    download
                    className={cn(
                      "flex-1 relative inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover-lift",
                      "border",
                      !result?.output_file
                        ? "pointer-events-none border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                        : "border-emerald-500/25 bg-emerald-500/12 text-emerald-100 hover:bg-emerald-500/18 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]",
                      downloadBlink &&
                        result?.output_file &&
                        "animate-download-blink"
                    )}
                  >
                    {Icons.download}
                    {result?.output_file
                      ? "Download"
                      : loading
                      ? "Preparing"
                      : "Download"}
                  </a>
                </div>

                {/* Desktop status + download row */}
                <div className="hidden md:flex flex-row gap-3 items-center justify-between">
                  <div className="text-xs text-[var(--text-muted)]">
                    {error ? (
                      <span className="text-rose-300 flex items-center gap-1.5">
                        {Icons.error}
                        {error}
                      </span>
                    ) : clarification ? (
                      <span className="text-amber-300 flex items-center gap-1.5">
                        {Icons.question}
                        Agent needs one more detail.
                      </span>
                    ) : result ? (
                      <span className="text-emerald-300 flex items-center gap-1.5">
                        {Icons.checkCircle}
                        Output ready for download.
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <span className="text-[var(--text-muted)]">{Icons.upload}</span>
                        Upload files, then describe what you need.
                      </span>
                    )}
                  </div>

                  <a
                    href={
                      result?.output_file
                        ? `/download/${result.output_file}`
                        : "#"
                    }
                    download
                    className={cn(
                      "relative inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover-lift",
                      "border",
                      !result?.output_file
                        ? "pointer-events-none border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                        : "border-emerald-500/25 bg-emerald-500/12 text-emerald-100 hover:bg-emerald-500/18 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]",
                      downloadBlink &&
                        result?.output_file &&
                        "animate-download-blink"
                    )}
                  >
                    {Icons.download}
                    {result?.output_file
                      ? downloadLabel
                      : loading
                      ? "Preparing"
                      : "Download"}
                    {loading ? (
                      <span
                        className="absolute inset-0 rounded-xl shimmer"
                        aria-hidden="true"
                      />
                    ) : null}
                  </a>
                </div>
              </form>
            </div>
          </section>

          <aside className="hidden md:block">
            <div className="glass-card rounded-2xl p-4 shadow-sm hover:shadow-[var(--shadow-glow)] transition-all duration-300">
              <div className="mb-3 text-xs font-medium text-[var(--text-primary)] flex items-center gap-2">
                <span className="text-[var(--accent-primary)]/70 drop-shadow-[0_0_4px_rgba(59,130,246,0.3)]">{Icons.clipboard}</span>
                Session
              </div>
              <div className="space-y-2.5 text-xs text-[var(--text-secondary)]">
                <div className="glass-subtle rounded-xl px-3 py-2 hover-scale cursor-default">
                  <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                    <span className="text-[var(--text-muted)]">{Icons.file}</span>
                    Selected
                  </div>
                  <div className="truncate mt-0.5 text-[var(--text-primary)]">
                    {files.length ? lastFileName || files[0]?.name : "—"}
                  </div>
                </div>
                <div className="glass-subtle rounded-xl px-3 py-2 hover-scale cursor-default">
                  <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                    <span className="text-[var(--text-muted)]">{Icons.signal}</span>
                    Status
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {loading ? (
                      <>
                        <span className="text-[var(--accent-primary)]">{Icons.spinner}</span>
                        <span className="text-[var(--text-primary)]">{isUploading ? "Uploading" : "Processing"}</span>
                      </>
                    ) : result ? (
                      <>
                        <span className="text-emerald-400">{Icons.check}</span>
                        <span className="text-[var(--text-primary)]">Ready</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[var(--text-muted)]">{Icons.minus}</span>
                        <span className="text-[var(--text-secondary)]">Idle</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="glass-subtle rounded-xl px-3 py-2 hover-scale cursor-default">
                  <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                    <span className="text-[var(--text-muted)]">{Icons.bolt}</span>
                    RAM usage
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn(ramIndicator.className)}>
                      {Icons.circle}
                    </span>
                    <span className="text-[var(--text-primary)]">{ramIndicator.label}</span>
                    <span className="text-[var(--text-muted)]">•</span>
                    <span className="text-[var(--text-secondary)]">
                      {ramStats
                        ? `${ramStats.rss_mb || ramStats.peak_rss_mb || "—"}MB`
                        : "Loading..."}
                    </span>
                  </div>
                </div>
                {loading && (
                  <div className="rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/8 px-3 py-2">
                    {isUploading ? (
                      <>
                        <div className="text-[11px] text-[var(--accent-primary)] flex items-center gap-1.5 mb-1">
                          {Icons.upload}
                          Uploading
                        </div>
                        <div className="text-[var(--text-primary)] font-medium text-sm mb-1.5">
                          {uploadProgress}%
                        </div>
                        <div className="w-full bg-[var(--bg-base)] rounded-full h-1 overflow-hidden">
                          <div
                            className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-[11px] text-[var(--accent-primary)] flex items-center gap-1.5 mb-1">
                          {Icons.clock}
                          Processing
                        </div>
                        <div className="text-[var(--text-primary)] font-medium text-sm">
                          {processingMessage || "Working..."}
                        </div>
                      </>
                    )}
                  </div>
                )}
                <div className="glass-subtle rounded-xl px-3 py-2 hover-scale cursor-default">
                  <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                    <span className="text-[var(--text-muted)]">{Icons.export}</span>
                    Output
                  </div>
                  <div className="truncate mt-0.5 text-[var(--text-primary)]">{result?.output_file || "—"}</div>
                </div>
              </div>
            </div>
          </aside>
        </main>

        <footer className="pt-4 text-xs text-[var(--text-muted)] glass-subtle rounded-lg px-4 py-2 inline-block">
          © {new Date().getFullYear()} OrderMyPDF — Professional document processing
        </footer>
      </div>
    </div>
  );
}
