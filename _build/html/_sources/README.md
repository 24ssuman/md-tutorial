# MD Tutorial Interactive Website (Jupyter Book)

This directory is a standalone scaffold to publish your notebooks as an interactive GitHub Pages site using:
- Jupyter Book (static site)
- Binder + Thebe (interactive execution)

## What to edit before publishing
- `_config.yml`:
  - `repository.url`
  - `repository.branch`
- `.github/workflows/deploy.yml`:
  - keep as-is unless your default branch is not `main`

## Local build (test env)
```bash
conda run -n test pip install -r requirements-book.txt
conda run -n test jupyter-book build .
```

## Publish
Push this directory as a GitHub repo (or as repo root), then enable GitHub Pages via Actions.
