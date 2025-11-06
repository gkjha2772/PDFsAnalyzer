# Persona PDF Analyzer

A lightweight system for persona-driven semantic analysis of PDF documents.

This repository contains a Flask backend that extracts and ranks relevant sections from PDFs using a local Sentence-Transformers model, and a React + Vite frontend UI to upload PDFs, supply a task and persona, and view/download analysis results.

## Highlights

- Upload one or more PDFs and provide a task description.
- Optionally supply a persona name or a persona JSON file.
- Backend extracts sections, embeds them, ranks by similarity and persona keywords, and returns a JSON analysis.
- Frontend shows status, extracted sections and refined snippets, and lets you download the JSON result.

## Directory structure

```
TrainingProject/
├── Backend/
│   ├── Dockerfile
│   ├── README.md
│   ├── requirements.txt
│   ├── Collection_1/ Collection_2/ Collection_3/   # sample collections and PDFs
│   └── src/
│       ├── app.py              # Flask app (POST /analyze, GET /health)
│       ├── utils.py            # PDF extraction, embedding, ranking
│       ├── persona.json        # persona store (keywords)
│       └── local_model/        # local sentence-transformers model (large)
├── Frontend/
│   ├── package.json
│   ├── vite.config.ts         # dev proxy configuration
│   └── src/                   # React + TypeScript UI (pages, components)
├── .gitignore
├── DEVS.md                    # developer setup and commands
└── README.md                  # this file
```

## Tech stack

- Backend: Python 3.10+, Flask, PyMuPDF (fitz), sentence-transformers, scikit-learn, numpy
- Frontend: React 18, TypeScript, Vite, Tailwind (shadcn/ui components)
- Model runtime: PyTorch (CPU wheel specified in requirements)

Note: the local embedding model under `Backend/src/local_model` is large and requires PyTorch to run inference locally. If you do not want to install or run it, the app will still start, but analysis will fail at embedding time.

## High-level flow

1. User uploads PDFs, enters a task and optionally a persona name or persona JSON via the UI.
2. Frontend POSTs multipart/form-data to `POST /analyze` (fields: `task`, `persona_name` or `persona_file`, and `pdfs` files).
3. Backend extracts text from PDFs, creates embeddings, ranks sections against the task embedding, refines subsections, and returns a JSON object containing metadata, extracted_sections and subsection_analysis.
4. Frontend displays results and lets the user download the JSON.

## Running locally (recommended)

Prerequisites

- Python 3.10+ (for backend)
- Node.js 18+ and npm (for frontend)

Backend

```powershell
cd Backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
cd src
python app.py
# health check
curl.exe http://localhost:5000/health
```

Frontend

```powershell
cd Frontend
npm install
npm run dev
# open the URL printed by Vite (usually http://localhost:8080)
```

Notes

- The frontend uses a Vite dev proxy for `/analyze` (configured in `vite.config.ts`) which forwards the request to `http://localhost:5000` in development.
- If you deploy the frontend to a preview or remote host, set `VITE_API_BASE` to your backend base URL so the frontend calls `${VITE_API_BASE}/analyze`.

## Environment

- Frontend: create `Frontend/.env.development` or set `VITE_API_BASE` in your environment. Example:

```
VITE_API_BASE=http://localhost:5000
```

## API

- POST /analyze

  - multipart/form-data
  - fields: `task` (string, required), `persona_name` (string, optional), `persona_file` (file, optional), `pdfs` (files, required)
  - response: JSON { metadata, extracted_sections, subsection_analysis }

- GET /health
  - returns JSON { status: 'ok', timestamp: '...' }

## Troubleshooting

- Unexpected token '<' (HTML returned)
  - If the frontend shows an “Unexpected token '<'” error it means the UI fetched HTML (usually the frontend host page) instead of JSON from the API. This commonly happens when the frontend is served from a preview host and calls the relative `/analyze` path. Fix by setting `VITE_API_BASE` to the backend URL in that environment or run the frontend locally with the proxy.
- Model / torch issues
  - Installing PyTorch and sentence-transformers can be heavy. If you don't want local inference, consider removing or bypassing the model loading in `utils.py` and mocking embedding calls for UI testing.

## Developer notes

- Use `DEVS.md` for quick setup and git commands.
- `.gitignore` included to ignore virtual environments, node_modules, build artifacts and common IDE files.

## License

MIT

## Contact

Open an issue or reach out to the repo owner for questions or help.
