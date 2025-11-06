"""Flask wrapper around the existing PDF/persona processing pipeline.

Endpoints
 - POST /analyze : multipart/form-data
     - pdfs: one or more PDF files
     - task: text (required)
     - persona_name: optional persona key (string)
     - persona_file: optional persona JSON file (if provided, used instead of built-in personas)

Behavior
 - Saves uploaded PDFs to a temporary folder and runs the same pipeline in `utils.py`.
 - Returns a JSON response with metadata, extracted_sections and subsection_analysis.
"""

import os
import json
import tempfile
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS

from utils import (
    extract_text_from_pdfs,
    embed_texts,
    rank_sections,
    refine_subsections,
    learn_new_keywords
)


BASE_DIR = os.path.dirname(__file__)
PERSONA_FILE = os.path.join(BASE_DIR, "persona.json")

app = Flask(__name__)
# Enable CORS for all routes (allow all origins). Adjust in production as needed.
CORS(app)


# Note: socket.io catch-all was removed per user request.


def load_personas_from_file(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            # persona.json uses top-level key 'personas' in this repo
            if isinstance(data, dict) and "personas" in data:
                return data["personas"]
            return data
    except Exception:
        return {}


@app.route("/", methods=["GET"])
def index():
    return jsonify({"ok": True, "message": "Upload PDFs, persona (or persona_name) and task to /analyze"})


@app.route("/health", methods=["GET"])
def health():
    """Simple health-check endpoint to verify the backend is up and returning JSON."""
    return jsonify({"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()})


@app.route("/analyze", methods=["POST"])
def analyze():
    # Validate
    print(f"[analyze] Received request from {request.remote_addr}")
    if "task" not in request.form:
        return jsonify({"error": "missing required form field: task"}), 400
    task = request.form["task"].strip()
    if not task:
        return jsonify({"error": "task cannot be empty"}), 400

    # persona can be provided as a name or uploaded JSON file
    persona_name = request.form.get("persona_name")
    persona_file = request.files.get("persona_file")

    # PDFs: accept multiple files under name 'pdfs'
    pdf_files = request.files.getlist("pdfs")
    if not pdf_files:
        return jsonify({"error": "no pdfs uploaded (field name 'pdfs')"}), 400

    # create a temporary folder to store uploaded PDFs
    tmpdir = tempfile.mkdtemp(prefix="uploads_", dir=BASE_DIR)

    docs = []
    saved_filenames = []
    for f in pdf_files:
        filename = secure_filename(f.filename)
        if not filename.lower().endswith(".pdf"):
            continue
        dest = os.path.join(tmpdir, filename)
        f.save(dest)
        docs.append({"filename": filename})
        saved_filenames.append(filename)

    print(f"[analyze] Saved files: {saved_filenames} -> tmpdir {tmpdir}")

    if not docs:
        return jsonify({"error": "no valid PDF files uploaded"}), 400

    # Load personas
    if persona_file:
        try:
            personas = json.load(persona_file)
            # allow either top-level or nested under 'personas'
            if isinstance(personas, dict) and "personas" in personas:
                personas = personas["personas"]
        except Exception:
            personas = {}
    else:
        personas = load_personas_from_file(PERSONA_FILE)

    persona_key = persona_name.lower() if persona_name else None

    # Run pipeline
    sections = extract_text_from_pdfs(tmpdir + os.path.sep, docs)

    task_embedding = embed_texts([ (persona_key or "") + " " + task ])[0]
    section_texts = [s["text"] for s in sections]
    section_embeddings = embed_texts(section_texts) if section_texts else []

    persona_keywords = []
    if persona_key and persona_key in personas:
        persona_keywords = personas.get(persona_key, {}).get("keywords", [])

    ranked_sections = rank_sections(
        sections,
        section_embeddings,
        task_embedding,
        keywords=persona_keywords
    )
    subsections = refine_subsections(ranked_sections)

    output = {
        "metadata": {
            "input_documents": saved_filenames,
            "persona": persona_key,
            "job_to_be_done": task,
            # frontend expects `metadata.timestamp`
            "timestamp": datetime.now(timezone.utc).isoformat()
        },
        "extracted_sections": [
            {
                "document": s["document"],
                "section_number": str(idx + 1),
                "section_title": s.get("section_title"),
                "importance_rank": idx + 1,
                "page_number": s.get("page_number")
            }
            for idx, s in enumerate(ranked_sections)
        ],
        "subsection_analysis": subsections
    }

    # If using built-in persona file (not uploaded), allow learning and update
    try:
        if not persona_file and persona_key:
            # update in-memory personas
            personas = learn_new_keywords(personas, persona_key, ranked_sections)
            # persist back to PERSONA_FILE
            with open(PERSONA_FILE, "w", encoding="utf-8") as pf:
                json.dump({"personas": personas}, pf, indent=4)
    except Exception:
        # learning is optional; ignore failures but don't crash
        pass
    
    return jsonify(output)


if __name__ == "__main__":
    # run development server
    app.run(host="0.0.0.0", port=5000, debug=True)
