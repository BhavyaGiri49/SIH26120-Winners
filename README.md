# Digital Twin for CSS & SRP Optimization

A fully synthetic, web-based simulation of heavy-oil wells (Cyclic Steam Stimulation +
Sucker Rod Pump) with a live physics/control-loop backend, an ML layer, an optimizer,
and a cinematic 3D frontend. **Prototype / simulation — not connected to real field
equipment.**

All TRD phases are implemented: physics core (FR1), synthetic dataset + ML regressor
and classifier (FR2/FR3), the viscosity-triggered control loop (FR4), event log (FR5),
optimizer (FR6), 3D single-well view incl. wax overlay (FR7/FR9), field overview +
portfolio ranking (FR8/FR12), integrated dashboard (FR10), and twin-vs-baseline (FR11).

## Run everything locally (two dev servers, hot reload)

```bash
# backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest -q                                   # 17 tests: physics pins + control-loop behavior
python3 generate.py --wells 12 --scenarios 20 --seed 42   # ~29k-row synthetic dataset
python3 train.py                             # trains + saves models/*.joblib + metrics.json
uvicorn app.main:app --reload --port 8000
```

```bash
# frontend, in a second terminal
cd frontend
npm install
npm run dev          # http://localhost:5173, proxies /api and /ws to :8000
```

`generate.py`/`train.py` only need to be re-run if you change physics constants or
want fresh models; the app runs fine without them (ML endpoints just report
"not trained yet" until you do). Config lives in `backend/config.yaml` (every
constant, per NFR-9 — no code changes needed to retune). Events persist to
`backend/events.jsonl` across restarts.

## Run as one container (production-style)

```bash
docker build -t digital-twin .
docker run -p 8000:8000 digital-twin        # open http://localhost:8000
```

FastAPI serves the built React bundle and the API from the same origin (TR-A6).
Trained models under `backend/models/` are baked into the image; the generated
`backend/data/` dataset is not (regeneratable, and not needed at runtime).

## UI notes

- Quality tiers (top bar): `low` / `medium` / `high` trade 3D visual fidelity
  (PBR materials, HDRI sky, bloom, depth-of-field, particles, reflective ground)
  for frame rate on weaker GPUs.
- Every panel (Field Overview, Well Detail, Charts, Event Log) collapses to a thin
  strip via its header chevron, and scrolls internally when expanded.
- Field Overview has a **Grid / Ranked** toggle — Ranked sorts wells by projected
  days-to-RED (FR12).
- Charts panel has a **History / Twin vs Baseline** toggle — Twin vs Baseline
  projects the selected well forward with the control loop on vs off (FR11).
- **About** (top bar) shows the trained ML models' metrics against their pass bars.
- Well Detail's **ML what-if** readout and **Optimizer** (run → apply) use the
  trained regressor/classifier and the TR-O1 grid search respectively.

## Useful during a demo

- `POST /api/sim/control {"action":"reset"}` — reseeds a fresh 12-well field.
- Push a well toward risk fast: `PATCH /api/wells/{id} {"S":144,"N":8}` then bump
  sim speed to 8× — watch it cross AMBER→RED, the control loop cut SPM (event log +
  the 3D rod visibly slowing), and eventually hit `RESTEAM_RECOMMENDED` at the SPM
  floor. `POST /api/wells/{id}/steam` to recover it.
- Click **Run** in the Optimizer panel for a well sitting in a bad state — it'll
  recommend a shorter, hotter cycle at higher S/N and let you **Apply** it live.

## Lint

```bash
cd backend && ruff check .        # clean
cd frontend && npm run lint       # oxlint, warnings only (no blocking errors)
```
