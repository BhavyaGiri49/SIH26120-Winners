from fastapi import APIRouter, Request

from app.ranking import rank_wells

router = APIRouter()


@router.get("/api/ranking")
def ranking(request: Request):
    field = request.app.state.field
    return rank_wells(field.cfg, field.wells)
