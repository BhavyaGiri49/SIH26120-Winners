from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.models import EventType, Severity
from app.optimizer import optimize_well

router = APIRouter()


class OptimizeBody(BaseModel):
    max_risk_share: Optional[float] = None


class ApplyBody(BaseModel):
    S: float
    N: float


@router.post("/api/wells/{well_id}/optimize")
def optimize(well_id: str, body: OptimizeBody, request: Request):
    field = request.app.state.field
    if well_id not in field.wells:
        raise HTTPException(status_code=404, detail=f"unknown well {well_id}")
    well = field.wells[well_id]
    return optimize_well(field.cfg, well.config, body.max_risk_share)


@router.post("/api/wells/{well_id}/optimize/apply")
def apply_optimization(well_id: str, body: ApplyBody, request: Request):
    field = request.app.state.field
    if well_id not in field.wells:
        raise HTTPException(status_code=404, detail=f"unknown well {well_id}")
    w = field.patch_well(well_id, S=body.S, N=body.N)
    field.events.emit(
        well_id, field.sim_day, EventType.OPTIMIZER_APPLIED, Severity.INFO,
        f"Optimizer recommendation applied on {well_id}: S={body.S:.0f}in, N={body.N:.1f}spm",
        {"S": body.S, "N": body.N},
    )
    return {"config": w.config.model_dump(), "state": w.latest.model_dump()}
