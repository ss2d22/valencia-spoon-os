from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import asyncio
import json
import base64

from ...tools.elevenlabs_voice import TribunalVoiceService
from ...agents.tribunal_orchestrator import orchestrator

router = APIRouter()

_voice_service: Optional[TribunalVoiceService] = None


def get_voice_service() -> TribunalVoiceService:
    global _voice_service
    if _voice_service is None:
        _voice_service = TribunalVoiceService()
    return _voice_service


class TranscribeRequest(BaseModel):
    audio_base64: str
    language: str = "en"


class SynthesizeRequest(BaseModel):
    text: str
    agent: str = "Narrator"
    intensity: float = 0.5


class VoiceMessageRequest(BaseModel):
    session_id: str
    audio_base64: str
    language: str = "en"


@router.post("/transcribe")
async def transcribe_audio(request: TranscribeRequest):
    try:
        voice = get_voice_service()
        audio_bytes = base64.b64decode(request.audio_base64)

        result = await voice.transcribe_audio(audio_bytes, request.language)

        return {
            "text": result["text"],
            "language": result["language"],
        }
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post("/transcribe-file")
async def transcribe_audio_file(file: UploadFile = File(...), language: str = "en"):
    try:
        voice = get_voice_service()
        audio_bytes = await file.read()

        result = await voice.transcribe_audio(audio_bytes, language)

        return {
            "text": result["text"],
            "language": result["language"],
        }
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post("/synthesize")
async def synthesize_speech(request: SynthesizeRequest):
    try:
        voice = get_voice_service()

        audio_bytes = await voice.synthesize_statement(
            agent_name=request.agent,
            text=request.text,
            emotion_intensity=request.intensity
        )

        return StreamingResponse(
            iter([audio_bytes]),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=speech.mp3"}
        )
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {str(e)}")


@router.post("/voice-message")
async def send_voice_message(request: VoiceMessageRequest):
    try:
        voice = get_voice_service()

        audio_bytes = base64.b64decode(request.audio_base64)
        transcription = await voice.transcribe_audio(audio_bytes, request.language)
        user_text = transcription["text"]

        if not user_text.strip():
            return {
                "user_text": "",
                "responses": [],
                "error": "Could not transcribe audio"
            }

        state = orchestrator.get_session_state(request.session_id)
        if not state:
            raise HTTPException(status_code=404, detail="Session not found")

        if orchestrator.is_verdict_request(user_text):
            verdict = await orchestrator.generate_verdict(request.session_id)

            session = orchestrator.sessions.get(request.session_id)
            is_chinese = session and session.paper_metadata.get("language") == "zh"

            if is_chinese:
                verdict_text = f"审判团已作出裁决。{verdict['decision']}。得分：{verdict['score']} 分（满分100）。{verdict['summary']}"
            else:
                verdict_text = f"The tribunal has reached its verdict. {verdict['decision']}. Score: {verdict['score']} out of 100. {verdict['summary']}"

            try:
                audio = await voice.synthesize_statement(
                    agent_name="narrator",
                    text=verdict_text,
                    emotion_intensity=0.7
                )
                audio_b64 = base64.b64encode(audio).decode("utf-8")
            except Exception:
                audio_b64 = None

            return {
                "user_text": user_text,
                "responses": [{
                    "agent": "审判团" if is_chinese else "The Tribunal",
                    "agent_key": "verdict",
                    "text": verdict_text,
                    "audio_base64": audio_b64
                }],
                "verdict": {
                    "decision": verdict["decision"],
                    "score": verdict["score"],
                    "summary": verdict["summary"],
                    "critical_issues": verdict["critical_issues"],
                    "neo_tx_hash": verdict.get("neo_tx_hash"),
                    "mem0_stored": verdict.get("mem0_stored", False),
                }
            }

        responses = await orchestrator.process_human_message(
            request.session_id,
            user_text,
            interrupt_current=False
        )

        audio_responses = []
        for r in responses:
            try:
                audio = await voice.synthesize_statement(
                    agent_name=r["agent"],
                    text=r["response"],
                    emotion_intensity=0.5
                )
                audio_responses.append({
                    "agent": r["agent"],
                    "agent_key": r["agent_key"],
                    "text": r["response"],
                    "audio_base64": base64.b64encode(audio).decode("utf-8")
                })
            except Exception:
                audio_responses.append({
                    "agent": r["agent"],
                    "agent_key": r["agent_key"],
                    "text": r["response"],
                    "audio_base64": None
                })

        return {
            "user_text": user_text,
            "responses": audio_responses
        }

    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice message failed: {str(e)}")


@router.websocket("/ws/{session_id}")
async def voice_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()

    state = orchestrator.get_session_state(session_id)
    if not state:
        await websocket.send_json({"type": "error", "message": "Session not found"})
        await websocket.close()
        return

    try:
        voice = get_voice_service()
    except ValueError:
        voice = None

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "audio":
                if not voice:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Voice service not available"
                    })
                    continue

                audio_bytes = base64.b64decode(data.get("data", ""))
                language = data.get("language", "en")

                try:
                    transcription = await voice.transcribe_audio(audio_bytes, language)
                    user_text = transcription["text"]

                    await websocket.send_json({
                        "type": "transcription",
                        "text": user_text
                    })

                    if not user_text.strip():
                        await websocket.send_json({"type": "done"})
                        continue

                    responses = await orchestrator.process_human_message(
                        session_id,
                        user_text,
                        interrupt_current=False
                    )

                    for r in responses:
                        try:
                            audio = await voice.synthesize_statement(
                                agent_name=r["agent"],
                                text=r["response"],
                                emotion_intensity=0.5
                            )
                            await websocket.send_json({
                                "type": "agent_response",
                                "agent": r["agent"],
                                "agent_key": r["agent_key"],
                                "text": r["response"],
                                "audio": base64.b64encode(audio).decode("utf-8")
                            })
                        except Exception:
                            await websocket.send_json({
                                "type": "agent_response",
                                "agent": r["agent"],
                                "agent_key": r["agent_key"],
                                "text": r["response"],
                                "audio": None
                            })

                    await websocket.send_json({"type": "done"})

                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Processing failed: {str(e)}"
                    })

            elif msg_type == "text":
                user_text = data.get("message", "")

                if not user_text.strip():
                    await websocket.send_json({"type": "done"})
                    continue

                responses = await orchestrator.process_human_message(
                    session_id,
                    user_text,
                    interrupt_current=False
                )

                for r in responses:
                    response_data = {
                        "type": "agent_response",
                        "agent": r["agent"],
                        "agent_key": r["agent_key"],
                        "text": r["response"],
                        "audio": None
                    }

                    if voice:
                        try:
                            audio = await voice.synthesize_statement(
                                agent_name=r["agent"],
                                text=r["response"],
                                emotion_intensity=0.5
                            )
                            response_data["audio"] = base64.b64encode(audio).decode("utf-8")
                        except Exception:
                            pass

                    await websocket.send_json(response_data)

                await websocket.send_json({"type": "done"})

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
