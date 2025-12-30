import React, { useState, useRef, useEffect } from "react";
const SUGGESTIONS = [
  { icon: "\u{1F4C4}", text: "Merge all PDFs" },
  { icon: "\u2702\uFE0F", text: "Extract first page" },
  { icon: "\u{1F5DC}\uFE0F", text: "Compress to 2MB" },
  { icon: "\u{1F4DD}", text: "Convert to DOCX" },
  { icon: "\u{1F5D1}\uFE0F", text: "Delete page 2" },
  { icon: "\u{1F4AB}", text: "Compress slightly" }
];
const PROCESSING_MESSAGES = [
  "\u{1F916} Analyzing your request\u2026",
  "\u{1F4C4} Preparing PDF operations\u2026",
  "\u2699\uFE0F Processing files securely\u2026",
  "\u2728 Optimizing output\u2026",
  "\u{1F4BE} Finalizing your files\u2026"
];
const getDownloadLabel = (operation, outputFile) => {
  const isDocx = outputFile?.toLowerCase().endsWith(".docx");
  switch (operation) {
    case "merge":
      return "Download Merged PDF";
    case "split":
      return "Download Extracted Pages";
    case "delete":
      return "Download Edited PDF";
    case "compress":
    case "compress_to_target":
      return "Download Compressed PDF";
    case "pdf_to_docx":
      return "Download DOCX File";
    case "multi":
      return isDocx ? "Download DOCX File" : "Download Processed PDF";
    default:
      return "Download Result";
  }
};
const TypingIndicator = () => /* @__PURE__ */ React.createElement("div", { className: "flex gap-1 items-center py-2" }, /* @__PURE__ */ React.createElement("span", { className: "inline-block w-2 h-2 rounded-full bg-accent-teal animate-bounce", style: { animationDelay: "0s" } }), /* @__PURE__ */ React.createElement("span", { className: "inline-block w-2 h-2 rounded-full bg-accent-teal animate-bounce", style: { animationDelay: "0.2s" } }), /* @__PURE__ */ React.createElement("span", { className: "inline-block w-2 h-2 rounded-full bg-accent-teal animate-bounce", style: { animationDelay: "0.4s" } }));
const MessageBubble = ({ message, isAgent = true, animate = true }) => /* @__PURE__ */ React.createElement("div", { className: `flex ${isAgent ? "justify-start" : "justify-end"} animate-slide-up` }, /* @__PURE__ */ React.createElement("div", { className: `max-w-xs px-4 py-3 rounded-2xl ${isAgent ? "glass border border-accent-teal/30 text-white/90" : "bg-gradient-to-r from-accent-teal to-accent-cyan text-gray-900 font-medium"} ${animate ? "animate-fade-in" : ""}` }, message));
const SuggestionsSidebar = ({ onSuggestionClick }) => {
  return /* @__PURE__ */ React.createElement("div", { className: "hidden lg:flex flex-col w-56 gap-4 py-8" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-semibold text-white/50 uppercase tracking-wider" }, "\u{1F4A1} Try something"), /* @__PURE__ */ React.createElement("div", { className: "space-y-3 overflow-hidden h-64" }, /* @__PURE__ */ React.createElement("div", { className: "animate-scroll-up space-y-3" }, SUGGESTIONS.concat(SUGGESTIONS).map((s, i) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: i,
      onClick: () => onSuggestionClick(`${s.text}`),
      className: "w-full text-left text-sm text-white/60 hover:text-accent-teal px-3 py-2 rounded-lg transition-smooth hover:bg-white/5 border border-white/5 hover:border-accent-teal/30"
    },
    s.icon,
    " ",
    s.text
  )))));
};
const FileChip = ({ files, onRemove }) => {
  if (files.length === 0)
    return null;
  const lastFile = files[files.length - 1];
  const fileName = lastFile.name.length > 20 ? lastFile.name.slice(0, 17) + "..." : lastFile.name;
  return /* @__PURE__ */ React.createElement("div", { className: "animate-slide-up flex items-center gap-2 px-3 py-2 rounded-full glass border border-accent-teal/40 w-fit" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm text-white/80" }, "\u{1F4CE} ", fileName), files.length > 1 && /* @__PURE__ */ React.createElement("span", { className: "text-xs bg-accent-teal/20 text-accent-teal rounded-full px-2 py-0.5 font-semibold" }, "+", files.length - 1));
};
export default function App() {
  const [files, setFiles] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([
    { text: "Hello! I'm your AI PDF assistant. Upload some PDFs and tell me what you'd like to do.", isAgent: true }
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [clarification, setClarification] = useState("");
  const [currentProcessingMessage, setCurrentProcessingMessage] = useState(0);
  const messagesEndRef = useRef(null);
  const processingIntervalRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    if (loading) {
      processingIntervalRef.current = setInterval(() => {
        setCurrentProcessingMessage((prev) => (prev + 1) % PROCESSING_MESSAGES.length);
      }, 2e3);
    } else {
      if (processingIntervalRef.current)
        clearInterval(processingIntervalRef.current);
    }
    return () => clearInterval(processingIntervalRef.current);
  }, [loading]);
  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    if (Array.from(e.target.files).length > 0) {
      const count = Array.from(e.target.files).length;
      setMessages((prev) => [...prev, {
        text: `\u{1F3AF} Got ${count} file${count > 1 ? "s" : ""}! What would you like me to do?`,
        isAgent: true
      }]);
    }
  };
  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
  };
  const handleSuggestionClick = (suggestion) => {
    setPrompt(suggestion);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || files.length === 0)
      return;
    setMessages((prev) => [...prev, { text: prompt, isAgent: false }]);
    setPrompt("");
    setLoading(true);
    setClarification("");
    setResult(null);
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("prompt", prompt);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3e4);
      const res = await fetch("/process", {
        method: "POST",
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok)
        throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      console.log("Response data:", data);
      if (data.status === "success") {
        setResult(data);
        setMessages((prev) => [
          ...prev,
          { text: `\u2705 ${data.message}`, isAgent: true }
        ]);
      } else if (data.message && (data.message.includes("clarif") || data.message.includes("How much") || data.message.includes("example"))) {
        setClarification(data.message);
        setMessages((prev) => [
          ...prev,
          { text: `\u2753 ${data.message}`, isAgent: true }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { text: `\u274C ${data.message || "Something went wrong"}`, isAgent: true }
        ]);
      }
    } catch (err) {
      console.error("Request failed:", err);
      const errorMsg = err.name === "AbortError" ? "Request timed out. Please try again." : `Connection error: ${err.message}`;
      setMessages((prev) => [...prev, { text: `\u26A0\uFE0F ${errorMsg}`, isAgent: true }]);
    } finally {
      setLoading(false);
    }
  };
  const handleClarificationSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim())
      return;
    setMessages((prev) => [...prev, { text: prompt, isAgent: false }]);
    setPrompt("");
    setLoading(true);
    setClarification("");
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("prompt", prompt);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3e4);
      const res = await fetch("/process", {
        method: "POST",
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok)
        throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.status === "success") {
        setResult(data);
        setMessages((prev) => [...prev, { text: `\u2705 ${data.message}`, isAgent: true }]);
      } else {
        setMessages((prev) => [...prev, { text: `\u274C ${data.message}`, isAgent: true }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { text: `\u26A0\uFE0F Error: ${err.message}`, isAgent: true }]);
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gradient-dark p-4" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-6xl mx-auto flex gap-8" }, /* @__PURE__ */ React.createElement(SuggestionsSidebar, { onSuggestionClick: handleSuggestionClick }), /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex flex-col max-w-3xl" }, /* @__PURE__ */ React.createElement("div", { className: "mb-8 text-center" }, /* @__PURE__ */ React.createElement("h1", { className: "text-5xl font-bold text-gradient mb-2 drop-shadow-lg" }, "OrderMyPDF"), /* @__PURE__ */ React.createElement("p", { className: "text-white/50 text-sm" }, "AI-powered PDF assistant")), /* @__PURE__ */ React.createElement("div", { className: "flex-1 glass rounded-2xl p-6 mb-6 overflow-y-auto space-y-4 max-h-96" }, messages.map((msg, i) => /* @__PURE__ */ React.createElement(
    MessageBubble,
    {
      key: i,
      message: msg.text,
      isAgent: msg.isAgent,
      animate: i === messages.length - 1
    }
  )), loading && /* @__PURE__ */ React.createElement("div", { className: "flex justify-start" }, /* @__PURE__ */ React.createElement("div", { className: "glass border border-accent-teal/30 rounded-2xl px-4 py-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-white/80 text-sm mb-1" }, PROCESSING_MESSAGES[currentProcessingMessage]), /* @__PURE__ */ React.createElement(TypingIndicator, null))), /* @__PURE__ */ React.createElement("div", { ref: messagesEndRef })), result && /* @__PURE__ */ React.createElement("div", { className: "mb-6 glass border border-accent-teal/40 rounded-2xl p-6 animate-slide-up" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-4" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "\u2728"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold text-gradient" }, result.message), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-white/50" }, "Operation: ", result.operation))), result.output_file && /* @__PURE__ */ React.createElement(
    "a",
    {
      href: `/download/${result.output_file}`,
      className: "inline-block px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-accent-teal to-accent-cyan hover:shadow-lg hover:shadow-accent-teal/50 transition-smooth hover:scale-105 text-gray-900",
      download: true
    },
    getDownloadLabel(result.operation, result.output_file),
    " \u2B07\uFE0F"
  )), /* @__PURE__ */ React.createElement("div", { className: "glass border border-accent-teal/20 rounded-2xl p-6 mb-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-semibold text-white/60 uppercase tracking-wider mb-3" }, "\u{1F4CE} PDF Files"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "file",
      accept: "application/pdf",
      multiple: true,
      onChange: handleFileChange,
      className: "block w-full text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-accent-teal file:to-accent-cyan file:text-gray-900 hover:file:shadow-lg hover:file:shadow-accent-teal/50 cursor-pointer transition-smooth"
    }
  ), files.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-3" }, /* @__PURE__ */ React.createElement(FileChip, { files }))), /* @__PURE__ */ React.createElement("form", { onSubmit: clarification ? handleClarificationSubmit : handleSubmit, className: "flex flex-col gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: prompt,
      onChange: handlePromptChange,
      placeholder: clarification ? "Please clarify\u2026" : "Tell me what to do (merge, compress, split, convert\u2026)",
      className: "w-full glass border border-accent-teal/40 rounded-2xl px-5 py-4 text-white placeholder:text-white/40 transition-smooth focus:border-accent-teal/80 focus:shadow-lg focus:shadow-accent-teal/30",
      disabled: loading
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "submit",
      disabled: loading || !prompt.trim() || files.length === 0,
      className: `absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 rounded-xl font-semibold transition-smooth text-sm ${loading || !prompt.trim() || files.length === 0 ? "bg-white/10 text-white/40 cursor-not-allowed" : "bg-gradient-to-r from-accent-teal to-accent-cyan text-gray-900 hover:shadow-lg hover:shadow-accent-teal/50 hover:scale-105"}`
    },
    loading ? "\u2026" : "\u2192"
  )), clarification && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-white/50 italic" }, clarification)))), /* @__PURE__ */ React.createElement("footer", { className: "text-center mt-12 text-white/30 text-xs" }, "\xA9 ", (/* @__PURE__ */ new Date()).getFullYear(), " OrderMyPDF \u2014 Powered by AI"));
}
