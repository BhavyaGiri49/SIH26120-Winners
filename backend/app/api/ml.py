from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.ml import ml_models

router = APIRouter()


class PredictBody(BaseModel):
    S: float
    N: float
    t_since_steam: float


@router.post("/api/wells/{well_id}/predict")
def predict(well_id: str, body: PredictBody, request: Request):
    field = request.app.state.field
    if well_id not in field.wells:
        raise HTTPException(status_code=404, detail=f"unknown well {well_id}")
    if not ml_models.available:
        raise HTTPException(status_code=503, detail="models not trained yet — run backend/train.py")
    well = field.wells[well_id]
    return ml_models.predict(
        field.cfg,
        T_peak=well.config.T_peak,
        tau=well.config.tau,
        S=body.S,
        N=body.N,
        t_since_steam=body.t_since_steam,
    )


@router.get("/api/models/metrics")
def models_metrics():
    if not ml_models.available:
        return {"available": False, "metrics": None}
    return {"available": True, "metrics": ml_models.metrics}
