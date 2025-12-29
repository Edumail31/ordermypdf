# OrderMyPDF Frontend

A modern React + Tailwind CSS UI for OrderMyPDF.

## Features
- Upload multiple PDF files
- Enter a natural language prompt (e.g. "merge these", "compress under 14MB", "convert to docx")
- Submit to FastAPI backend
- See result and download processed file

## Getting Started

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Notes
- The frontend proxies API requests to the backend at `localhost:8000`.
- Make sure your FastAPI backend is running.
