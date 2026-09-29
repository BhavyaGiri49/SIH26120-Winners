from typing import List, Optional

from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/api/events")
def get_events(request: Request, since_id: int = 0, well_id: Optional[str] = None, type: Optional[str] = None) -> List[dict]:
    field = request.app.state.field
    events = field.events.since(since_id, well_id=well_id, type_=type)
    return [e.model_dump() for e in events]
