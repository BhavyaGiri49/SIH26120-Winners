from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/api/field")
def get_field(request: Request):
    field = request.app.state.field
    return field.field_snapshot()
