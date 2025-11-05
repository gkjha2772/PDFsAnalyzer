Developer setup and common commands

## Overview

This project contains a Frontend (Vite + React + TypeScript) and a Backend (Flask + Python). Use the instructions below to set up a local development environment and common git commands.

## Backend (Python)

# Create and activate virtual environment

python -m venv .venv

# PowerShell activation

.\.venv\Scripts\Activate.ps1

# (or for cmd.exe)

.\.venv\Scripts\activate

# Upgrade pip and install dependencies

python -m pip install --upgrade pip
pip install -r Backend/requirements.txt

# Start backend

cd Backend/src
python app.py

# Health check

curl.exe http://localhost:5000/health

## Frontend (Node)

# Install Node.js (v18+) and npm

# From repo root

cd Frontend
npm install

# Local development (dev server with HMR + proxy)

npm run dev

# Build for production

npm run build
npm run preview

## Environment variables

Frontend uses a Vite env var to point to the backend when the frontend cannot proxy to localhost.

- `VITE_API_BASE` (optional)
  - Example `.env.development`:
    VITE_API_BASE=http://localhost:5000
  - For deployed previews, set `VITE_API_BASE` to the public backend URL.

## Git basics

# Initialize repository (if needed)

git init

# Add remote (example)

git remote add origin https://github.com/<user>/<repo>.git

# Commit changes

git add .
git commit -m "Initial commit"

# Create a new branch

git checkout -b feat/my-feature

# Push branch

git push -u origin feat/my-feature

# Merge flow

git checkout main
git pull origin main
git merge feat/my-feature
git push origin main

## Notes

- The repo contains a local model directory under `Backend/src/local_model` — if this is large and you don't want it tracked, add it to `.gitignore`.
- For production deployments, consider using a proper WSGI server (gunicorn) and hosting the frontend `dist` folder behind a CDN.
