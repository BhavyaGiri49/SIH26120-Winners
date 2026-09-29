"""Append-only event log (TRD §6.5 / TR-E1). Persisted to events.jsonl so a backend
restart doesn't wipe the demo history."""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from app.models import Event, EventType, Severity


class EventsStore:
    def __init__(self, path: str = None):
        if path is None:
            path = Path(__file__).resolve().parent.parent / "events.jsonl"
        self.path = Path(path)
        self._events: List[Event] = []
        self._next_id = 1
        self._load()

    def _load(self) -> None:
        if not self.path.exists():
            return
        with open(self.path, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                self._events.append(Event(**json.loads(line)))
        if self._events:
            self._next_id = max(e.event_id for e in self._events) + 1

    def emit(
        self,
        well_id: str,
        sim_day: float,
        type_: EventType,
        severity: Severity,
        message: str,
        payload: Optional[dict] = None,
    ) -> Event:
        event = Event(
            event_id=self._next_id,
            ts_wall=datetime.now(timezone.utc).isoformat(),
            sim_day=round(sim_day, 3),
            well_id=well_id,
            type=type_,
            severity=severity,
            message=message,
            payload=payload or {},
        )
        self._next_id += 1
        self._events.append(event)
        with open(self.path, "a") as f:
            f.write(event.model_dump_json() + "\n")
        return event

    def since(self, since_id: int = 0, well_id: Optional[str] = None, type_: Optional[str] = None) -> List[Event]:
        results = [e for e in self._events if e.event_id > since_id]
        if well_id:
            results = [e for e in results if e.well_id == well_id]
        if type_:
            results = [e for e in results if e.type == type_]
        return results

    def latest(self, limit: int = 200) -> List[Event]:
        return self._events[-limit:]

    def reset(self) -> None:
        self._events = []
        self._next_id = 1
        if self.path.exists():
            os.remove(self.path)
