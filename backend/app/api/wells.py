from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter()


class PatchWellBody(BaseModel):
    S: Optional[float] = None
    N: Optional[float] = None
    loop_enabled: Optional[bool] = None
    T_peak: Optional[float] = None


@router.patch("/api/wells/{well_id}")
def patch_well(well_id: str, body: PatchWellBody, request: Request):
    field = request.app.state.field
    if well_id not in field.wells:
        raise HTTPException(status_code=404, detail=f"unknown well {well_id}")
    w = field.patch_well(well_id, S=body.S, N=body.N, loop_enabled=body.loop_enabled, T_peak=body.T_peak)
    return {"config": w.config.model_dump(), "state": w.latest.model_dump()}


@router.post("/api/wells/{well_id}/steam")
def steam_well(well_id: str, request: Request):
    field = request.app.state.field
    if well_id not in field.wells:
        raise HTTPException(status_code=404, detail=f"unknown well {well_id}")
    w = field.steam_now(well_id)
    return {"config": w.config.model_dump(), "state": w.latest.model_dump()}


@router.get("/api/wells/{well_id}/history")
def well_history(well_id: str, request: Request) -> List[dict]:
    field = request.app.state.field
    if well_id not in field.wells:
        raise HTTPException(status_code=404, detail=f"unknown well {well_id}")
    return [p.model_dump() for p in field.wells[well_id].history]
