import React, { useState } from "react";

export default function App() {
  const [files, setFiles] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [clarification, setClarification] = useState("");

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handlePromptChange = (e) => {
    setPrompt(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setClarification("");
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("prompt", prompt);
    try {
      const res = await fetch("/process", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.status === "success") {
        setResult(data);
      } else if (data.message && data.message.toLowerCase().includes("clarify")) {
        setClarification(data.message);
      } else {
        setError(data.message || "Unknown error");
      }
    } catch (err) {
      setError("Failed to connect to backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526] p-4">
      <div className="w-full max-w-lg rounded-2xl shadow-2xl p-8 relative bg-white/10 backdrop-blur-md border border-white/20" style={{boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'}}>
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-[#00fff0] via-[#00ffb3] to-[#00fff0] rounded-full blur-sm opacity-80 animate-pulse" />
        <h1 className="text-3xl font-extrabold mb-6 text-center text-white drop-shadow-[0_1.2px_1.2px_rgba(0,255,255,0.7)] tracking-tight select-none">
          OrderMyPDF
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-medium mb-2 text-white/80">Upload PDF(s)</label>
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleFileChange}
              className="block w-full border border-white/30 rounded-lg px-3 py-2 bg-white/20 text-white placeholder:text-white/60 focus:ring-2 focus:ring-[#00fff0] focus:outline-none transition"
              required
            />
          </div>
          <div>
            <label className="block font-medium mb-2 text-white/80">Prompt</label>
            <div className="relative">
              <input
                type="text"
                value={prompt}
                onChange={handlePromptChange}
                placeholder="e.g. merge, split, compress, convert to docx..."
                className="block w-full border border-white/30 rounded-lg px-4 py-3 bg-white/20 text-white placeholder:text-white/60 focus:ring-2 focus:ring-[#00fff0] focus:outline-none text-lg shadow-inner backdrop-blur-md transition"
                style={{boxShadow: '0 0 8px 0 #00fff0aa'}}
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00fff0] text-xl pointer-events-none drop-shadow-[0_1.2px_1.2px_rgba(0,255,255,0.7)]">
                ✨
              </span>
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[#00fff0] via-[#00ffb3] to-[#00fff0] text-gray-900 py-2 rounded-lg font-bold shadow-lg hover:from-[#00ffb3] hover:to-[#00fff0] hover:scale-[1.03] transition-all duration-200 border border-white/20"
            disabled={loading}
            style={{textShadow: '0 0 8px #00fff0'}}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin h-5 w-5 border-2 border-t-transparent border-[#00fff0] rounded-full"></span>
                Processing...
              </span>
            ) : (
              "Process PDF(s)"
            )}
          </button>
        </form>
        {clarification && (
          <div className="mt-4 text-yellow-300 text-center font-semibold bg-white/10 rounded-lg py-2 px-3 border border-yellow-300/30">
            {clarification}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPrompt(clarification);
                setClarification("");
              }}
              className="mt-2"
            >
              <input
                type="text"
                value={prompt}
                onChange={handlePromptChange}
                className="block w-full border border-yellow-300/30 rounded-lg px-4 py-2 bg-white/20 text-yellow-900 placeholder:text-yellow-600 focus:ring-2 focus:ring-yellow-300 focus:outline-none text-lg shadow-inner backdrop-blur-md transition"
                placeholder="Please clarify your request..."
                required
              />
              <button
                type="submit"
                className="mt-2 w-full bg-yellow-300 text-gray-900 py-2 rounded-lg font-bold shadow-lg hover:bg-yellow-400 transition-all duration-200 border border-yellow-300/20"
              >
                Submit Clarification
              </button>
            </form>
          </div>
        )}
        {error && (
          <div className="mt-4 text-red-400 text-center font-semibold bg-white/10 rounded-lg py-2 px-3 border border-red-400/30">
            {error}
          </div>
        )}
        {result && (
          <div className="mt-6 text-center">
            <div className="text-[#00fff0] font-bold mb-2 text-lg drop-shadow-[0_1.2px_1.2px_rgba(0,255,255,0.7)]">{result.message}</div>
            {result.output_file && (
              <a
                href={`/download/${result.output_file}`}
                className="inline-block mt-2 px-6 py-2 bg-gradient-to-r from-[#00fff0] via-[#00ffb3] to-[#00fff0] text-gray-900 rounded-lg font-bold shadow-lg hover:from-[#00ffb3] hover:to-[#00fff0] hover:scale-105 transition-all duration-200 border border-white/20"
                download
              >
                Download Result
              </a>
            )}
          </div>
        )}
      </div>
      <footer className="mt-8 text-white/40 text-xs text-center select-none">
        &copy; {new Date().getFullYear()} OrderMyPDF &mdash; AI-powered PDF tool
      </footer>
    </div>
  );
}
