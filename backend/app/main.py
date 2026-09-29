import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import compare, events, field, forecast, ml, optimizer, ranking, sim, wells, ws
from app.config import load_config
from app.engine import FieldState
from app.ws_manager import ConnectionManager


async def _tick_loop(app: FastAPI):
    field_state: FieldState = app.state.field
    manager: ConnectionManager = app.state.ws_manager
    tick_seconds = field_state.cfg.sim_clock.tick_ms / 1000.0
    while True:
        await asyncio.sleep(tick_seconds)
        payload = field_state.tick()
        if payload is not None:
            await manager.broadcast(payload)


@asynccontextmanager
async def lifespan(app: FastAPI):
    cfg = load_config()
    app.state.field = FieldState(cfg)
    app.state.ws_manager = ConnectionManager()
    task = asyncio.create_task(_tick_loop(app))
    yield
    task.cancel()


app = FastAPI(title="Digital Twin — CSS & SRP Optimization (prototype)", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(field.router)
app.include_router(wells.router)
app.include_router(sim.router)
app.include_router(events.router)
app.include_router(ml.router)
app.include_router(optimizer.router)
app.include_router(ranking.router)
app.include_router(compare.router)
app.include_router(forecast.router)
app.include_router(ws.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "banner": "SIMULATION — NOT CONNECTED TO FIELD EQUIPMENT"}


# Single-image deployment (TR-A6): if the frontend has been built, serve it as
# static files from the same origin as the API. Mounted last so /api/* and /ws
# (registered above) are matched first. Absent in local dev (`npm run dev`
# serves the frontend itself via its own Vite server on :5173).
_FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if _FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=str(_FRONTEND_DIST), html=True), name="frontend")
