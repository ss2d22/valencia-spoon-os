"""
Voice API Routes for Real-time Tribunal Interaction

Provides WebSocket and REST endpoints for:
- Speech-to-text (STT) via ElevenLabs Scribe
- Text-to-speech (TTS) via ElevenLabs
- Real-time voice conversation with agents
"""

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

# Lazy-load voice service to handle missing API key gracefully
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
    """
    Transcribe audio to text using ElevenLabs Scribe.

    Accepts base64-encoded audio data (webm, mp3, wav supported).
    Returns transcribed text.
    """
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
    """
    Transcribe an uploaded audio file to text.
    """
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
    """
    Synthesize text to speech using ElevenLabs.

    Returns audio as streaming MP3.
    """
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
    """
    Send a voice message to the tribunal.

    1. Transcribes the audio to text
    2. Sends text to orchestrator
    3. Returns agent responses with synthesized audio

    Returns JSON with text responses and base64-encoded audio for each.
    """
    try:
        voice = get_voice_service()

        # Transcribe user's voice
        audio_bytes = base64.b64decode(request.audio_base64)
        transcription = await voice.transcribe_audio(audio_bytes, request.language)
        user_text = transcription["text"]

        if not user_text.strip():
            return {
                "user_text": "",
                "responses": [],
                "error": "Could not transcribe audio"
            }

        # Get state and send to orchestrator
        state = orchestrator.get_session_state(request.session_id)
        if not state:
            raise HTTPException(status_code=404, detail="Session not found")

        # Process the message
        responses = await orchestrator.process_human_message(
            request.session_id,
            user_text,
            interrupt_current=False
        )

        # Synthesize audio for each response
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
                # If TTS fails, still return text
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
    """
    WebSocket for real-time voice interaction.

    Protocol:
    - Client sends: {"type": "audio", "data": "<base64 audio>", "language": "en"}
    - Server responds: {"type": "transcription", "text": "..."}
    - Server responds: {"type": "agent_response", "agent": "...", "text": "...", "audio": "<base64>"}
    - Server responds: {"type": "done"}

    Or for text-only:
    - Client sends: {"type": "text", "message": "..."}
    """
    await websocket.accept()

    # Verify session exists
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

                # Transcribe audio
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

                    # Process through orchestrator
                    responses = await orchestrator.process_human_message(
                        session_id,
                        user_text,
                        interrupt_current=False
                    )

                    # Send each agent response with audio
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
                # Text-only message (no STT needed)
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

                    # Try to synthesize audio if voice is available
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
