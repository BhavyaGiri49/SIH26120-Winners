from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    field = websocket.app.state.field
    manager = websocket.app.state.ws_manager
    await manager.connect(websocket)
    try:
        await websocket.send_json(field.snapshot_payload())
        while True:
            # We don't expect incoming messages; just keep the connection alive.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
