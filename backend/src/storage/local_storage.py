import os
import json
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any


DATA_DIR = Path(__file__).parent.parent.parent / "data"
VERDICTS_DIR = DATA_DIR / "verdicts"
AUDIO_DIR = DATA_DIR / "audio"


def ensure_dirs():
    VERDICTS_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)


class LocalVerdictStorage:
    def __init__(self):
        ensure_dirs()

    async def store_verdict(self, verdict: Dict[str, Any], tribunal_id: str) -> Optional[str]:
        path = VERDICTS_DIR / f"{tribunal_id}.json"
        with open(path, "w") as f:
            json.dump(verdict, f, indent=2, default=str)
        return f"verdicts/{tribunal_id}.json"

    async def store_audio(self, audio_bytes: bytes, tribunal_id: str) -> Optional[str]:
        path = AUDIO_DIR / f"{tribunal_id}.mp3"
        with open(path, "wb") as f:
            f.write(audio_bytes)
        return f"audio/{tribunal_id}.mp3"

    async def get_verdict(self, tribunal_id: str) -> Optional[Dict[str, Any]]:
        path = VERDICTS_DIR / f"{tribunal_id}.json"
        if not path.exists():
            return None
        with open(path, "r") as f:
            return json.load(f)

    async def get_audio_path(self, tribunal_id: str) -> Optional[str]:
        path = AUDIO_DIR / f"{tribunal_id}.mp3"
        if path.exists():
            return str(path)
        return None

    async def get_audio_url(self, tribunal_id: str, expires_in: int = 3600) -> Optional[str]:
        path = AUDIO_DIR / f"{tribunal_id}.mp3"
        if path.exists():
            return f"/api/tribunal/{tribunal_id}/audio"
        return None

    async def get_verdict_url(self, tribunal_id: str, expires_in: int = 3600) -> Optional[str]:
        path = VERDICTS_DIR / f"{tribunal_id}.json"
        if path.exists():
            return f"/api/tribunal/{tribunal_id}/verdict"
        return None

    async def delete_tribunal_data(self, tribunal_id: str) -> bool:
        verdict_path = VERDICTS_DIR / f"{tribunal_id}.json"
        audio_path = AUDIO_DIR / f"{tribunal_id}.mp3"

        deleted = False
        if verdict_path.exists():
            verdict_path.unlink()
            deleted = True
        if audio_path.exists():
            audio_path.unlink()
            deleted = True
        return deleted
