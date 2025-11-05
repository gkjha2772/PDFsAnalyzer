import fitz  # PyMuPDF
import re
import numpy as np
import os
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from collections import Counter

MODEL = SentenceTransformer( os.path.join(os.path.dirname(__file__), "local_model"))

def extract_text_from_pdfs(pdf_folder, docs):
    sections = []
    for doc in docs:
        pdf_path = os.path.join(pdf_folder, doc["filename"])
        pdf = fitz.open(pdf_path)
        for page_num in range(len(pdf)):
            page = pdf[page_num]
            text = page.get_text()
            splits = re.split(r'\n(?=[A-Z][^\n]{3,})', text)
            for part in splits:
                if len(part.strip()) > 200:
                    sections.append({
                        "document": doc["filename"],
                        "page_number": page_num + 1,
                        "section_title": part.split('\n')[0].strip(),
                        "text": part.strip()
                    })
    return sections

def embed_texts(texts):
    return MODEL.encode(texts)

def rank_sections(sections, section_embeddings, task_embedding, top_k=10, top_per_doc=3, keywords=None):
    sims = cosine_similarity([task_embedding], section_embeddings)[0]

    scored_sections = []
    for sec, sim in zip(sections, sims):
        bonus = 0.0
        if keywords:
            text = sec["text"].lower()
            keyword_hits = 0
            for k in keywords:
                keyword_hits += len(re.findall(rf"\b{k}\b", text))
            bonus = min(1.0, keyword_hits * 0.1)

        final_score = 0.7 * sim + 0.3 * bonus

        sec_copy = sec.copy()
        sec_copy["score"] = final_score
        scored_sections.append(sec_copy)

    # group by doc
    doc_groups = {}
    for sec in scored_sections:
        doc = sec["document"]
        doc_groups.setdefault(doc, []).append(sec)

    top_sections = []
    for secs in doc_groups.values():
        top_in_doc = sorted(secs, key=lambda x: x["score"], reverse=True)[:top_per_doc]
        top_sections.extend(top_in_doc)

    top_sections = sorted(top_sections, key=lambda x: x["score"], reverse=True)[:top_k]
    return top_sections

def refine_subsections(ranked_sections):
    """Return refined subsection entries with section identifiers.

    Each returned dict includes:
      - document
      - section_number (string)
      - section_title
      - refined_text
      - page_number
    """
    refined = []
    for idx, sec in enumerate(ranked_sections):
        paragraphs = sec["text"].split("\n\n")
        for p in paragraphs:
            if len(p.split()) > 20:
                refined.append({
                    "document": sec["document"],
                    "section_number": str(idx + 1),
                    "section_title": sec.get("section_title"),
                    "refined_text": p.strip(),
                    "page_number": sec.get("page_number")
                })
                break
    return refined

def learn_new_keywords(personas, persona, sections):
    """
    Learn new keywords from high-ranked sections.
    If the persona doesn't exist yet, create it.
    """
    # If this persona is new, add it
    if persona not in personas:
        print(f"🆕 Adding new persona: {persona}")
        personas[persona] = {"keywords": []}

    # Existing keywords
    current_keywords = set(personas[persona].get("keywords", []))

    # Simple word extraction: lowercase words, longer than 4 chars, no digits
    new_words = []
    for sec in sections:
        words = re.findall(r'\b[a-zA-Z]{5,}\b', sec["text"].lower())
        new_words.extend(words)

    # Keep only unique new keywords that aren't in existing ones
    new_keywords = set(new_words) - current_keywords

    # Update
    updated = current_keywords.union(new_keywords)
    personas[persona]["keywords"] = sorted(updated)

    return personas

