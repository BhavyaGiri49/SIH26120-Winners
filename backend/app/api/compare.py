from fastapi import APIRouter, HTTPException, Request

from app.compare import compare_well

router = APIRouter()


@router.get("/api/wells/{well_id}/compare")
def compare(well_id: str, request: Request):
    field = request.app.state.field
    if well_id not in field.wells:
        raise HTTPException(status_code=404, detail=f"unknown well {well_id}")
    return compare_well(field.cfg, field.wells[well_id])
