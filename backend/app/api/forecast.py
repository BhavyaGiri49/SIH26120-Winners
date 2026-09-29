from fastapi import APIRouter, HTTPException, Request

from app.forecast import forecast_well

router = APIRouter()


@router.get("/api/wells/{well_id}/forecast")
def forecast(well_id: str, request: Request, horizon_days: int = 30):
    field = request.app.state.field
    if well_id not in field.wells:
        raise HTTPException(status_code=404, detail=f"unknown well {well_id}")
    return forecast_well(field.cfg, field.wells[well_id], horizon_days)
