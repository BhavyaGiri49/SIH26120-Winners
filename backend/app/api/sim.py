from typing import Literal, Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter()


class SimControlBody(BaseModel):
    action: Literal["play", "pause", "reset", "seek", "step"]
    speed: Optional[float] = None
    day: Optional[float] = None
    step_days: Optional[float] = None


@router.post("/api/sim/control")
async def sim_control(body: SimControlBody, request: Request):
    field = request.app.state.field
    manager = request.app.state.ws_manager

    if body.action == "seek":
        field.seek(body.day if body.day is not None else field.sim_day)
    elif body.action == "step":
        field.step(body.step_days or 1.0)
    else:
        field.control(body.action, body.speed)

    if body.action in ("reset", "seek", "step"):
        # These jump state discontinuously — push a full snapshot immediately
        # rather than waiting for the next tick, so every connected client's
        # sim day, event log, history and 3D telemetry all update together.
        await manager.broadcast(field.snapshot_payload())

    return {"sim_day": field.sim_day, "speed": field.speed, "paused": field.paused}
