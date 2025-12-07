import asyncio
import os
import io
from typing import List, Dict, Any, Optional

from elevenlabs.client import ElevenLabs
from elevenlabs import VoiceSettings
from spoon_ai.tools.base import BaseTool
from pydantic import PrivateAttr


class TribunalVoiceService:
    """Combined TTS and STT service for the tribunal using ElevenLabs."""

    def __init__(self):
        api_key = os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            raise ValueError("ELEVENLABS_API_KEY not set")
        self.client = ElevenLabs(api_key=api_key)

        # Read voice IDs from environment variables with fallbacks
        # Support both agent keys (skeptic) and display names (The Skeptic) for flexibility
        skeptic_voice = os.getenv("SKEPTIC_VOICE_ID", "pNInz6obpgDQGcFmaJgB")
        statistician_voice = os.getenv("STATISTICIAN_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
        methodologist_voice = os.getenv("METHODOLOGIST_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")
        ethicist_voice = os.getenv("ETHICIST_VOICE_ID", "ThT5KcBeYPX3keUQqHPh")
        narrator_voice = os.getenv("NARRATOR_VOICE_ID", "onwK4e9ZLuTAKqWW03F9")

        self.VOICE_MAP = {
            # Agent keys (preferred - language-independent)
            "skeptic": skeptic_voice,
            "statistician": statistician_voice,
            "methodologist": methodologist_voice,
            "ethicist": ethicist_voice,
            "narrator": narrator_voice,
            # Display names (backwards compatibility)
            "The Skeptic": skeptic_voice,
            "The Statistician": statistician_voice,
            "The Methodologist": methodologist_voice,
            "The Ethicist": ethicist_voice,
            "Narrator": narrator_voice,
        }

    async def transcribe_audio(
        self,
        audio_data: bytes,
        language_code: str = "en"
    ) -> Dict[str, Any]:
        """
        Transcribe audio using ElevenLabs Scribe STT.

        Args:
            audio_data: Raw audio bytes (supports mp3, wav, webm, etc.)
            language_code: Language code (e.g., "en", "es", "fr")

        Returns:
            Dict with transcript text and metadata
        """
        def _sync_transcribe():
            # Create a file-like object from bytes
            audio_file = io.BytesIO(audio_data)
            audio_file.name = "audio.webm"  # ElevenLabs needs a filename hint

            result = self.client.speech_to_text.convert(
                file=audio_file,
                model_id="scribe_v1",  # Standard model, good accuracy
                language_code=language_code,
            )
            return result

        result = await asyncio.to_thread(_sync_transcribe)

        return {
            "text": result.text if hasattr(result, 'text') else str(result),
            "language": language_code,
        }

    async def synthesize_statement(
        self,
        agent_name: str,
        text: str,
        emotion_intensity: float = 0.5
    ) -> bytes:
        """Synthesize speech for an agent's statement."""
        voice_id = self.VOICE_MAP.get(agent_name, self.VOICE_MAP["Narrator"])
        stability = max(0.3, 1.0 - emotion_intensity * 0.5)

        def _sync_convert():
            response = self.client.text_to_speech.convert(
                voice_id=voice_id,
                text=text,
                model_id="eleven_turbo_v2_5",
                output_format="mp3_44100_128",
                voice_settings=VoiceSettings(
                    stability=stability,
                    similarity_boost=0.8,
                    style=emotion_intensity * 0.5,
                    use_speaker_boost=True,
                    speed=1.0
                )
            )
            return b"".join(chunk for chunk in response if chunk)

        return await asyncio.to_thread(_sync_convert)

    async def synthesize_streaming(
        self,
        agent_name: str,
        text: str,
        emotion_intensity: float = 0.5
    ):
        """
        Stream TTS audio chunks for lower latency.
        Yields audio chunks as they're generated.
        """
        voice_id = self.VOICE_MAP.get(agent_name, self.VOICE_MAP["Narrator"])
        stability = max(0.3, 1.0 - emotion_intensity * 0.5)

        def _sync_stream():
            return self.client.text_to_speech.convert(
                voice_id=voice_id,
                text=text,
                model_id="eleven_turbo_v2_5",
                output_format="mp3_44100_128",
                voice_settings=VoiceSettings(
                    stability=stability,
                    similarity_boost=0.8,
                    style=emotion_intensity * 0.5,
                    use_speaker_boost=True,
                    speed=1.0
                )
            )

        # Get the generator in a thread-safe way
        generator = await asyncio.to_thread(_sync_stream)

        # Yield chunks
        for chunk in generator:
            if chunk:
                yield chunk


# Keep backward compatibility
class TribunalVoiceSynthesizer:
    def __init__(self):
        api_key = os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            raise ValueError("ELEVENLABS_API_KEY not set")
        self.client = ElevenLabs(api_key=api_key)

        # Read voice IDs from environment variables with fallbacks
        # Support both agent keys (skeptic) and display names (The Skeptic) for flexibility
        skeptic_voice = os.getenv("SKEPTIC_VOICE_ID", "pNInz6obpgDQGcFmaJgB")
        statistician_voice = os.getenv("STATISTICIAN_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
        methodologist_voice = os.getenv("METHODOLOGIST_VOICE_ID", "EXAVITQu4vr4xnSDxMaL")
        ethicist_voice = os.getenv("ETHICIST_VOICE_ID", "ThT5KcBeYPX3keUQqHPh")
        narrator_voice = os.getenv("NARRATOR_VOICE_ID", "onwK4e9ZLuTAKqWW03F9")

        self.VOICE_MAP = {
            # Agent keys (preferred - language-independent)
            "skeptic": skeptic_voice,
            "statistician": statistician_voice,
            "methodologist": methodologist_voice,
            "ethicist": ethicist_voice,
            "narrator": narrator_voice,
            # Display names (backwards compatibility)
            "The Skeptic": skeptic_voice,
            "The Statistician": statistician_voice,
            "The Methodologist": methodologist_voice,
            "The Ethicist": ethicist_voice,
            "Narrator": narrator_voice,
        }

    async def synthesize_statement(
        self,
        agent_name: str,
        text: str,
        emotion_intensity: float = 0.5
    ) -> bytes:
        voice_id = self.VOICE_MAP.get(agent_name, self.VOICE_MAP["Narrator"])
        stability = max(0.3, 1.0 - emotion_intensity * 0.5)

        def _sync_convert():
            response = self.client.text_to_speech.convert(
                voice_id=voice_id,
                text=text,
                model_id="eleven_turbo_v2_5",
                output_format="mp3_44100_128",
                voice_settings=VoiceSettings(
                    stability=stability,
                    similarity_boost=0.8,
                    style=emotion_intensity * 0.5,
                    use_speaker_boost=True,
                    speed=1.0
                )
            )
            return b"".join(chunk for chunk in response if chunk)

        return await asyncio.to_thread(_sync_convert)

    async def synthesize_debate_round(self, statements: List[Dict[str, Any]]) -> List[bytes]:
        audio_segments = []
        for statement in statements:
            audio = await self.synthesize_statement(
                agent_name=statement.get("agent", "Narrator"),
                text=statement.get("text", ""),
                emotion_intensity=statement.get("intensity", 0.5)
            )
            audio_segments.append(audio)
            await asyncio.sleep(0.1)
        return audio_segments

    async def synthesize_full_tribunal(
        self,
        intro: str,
        debate_rounds: List[List[Dict[str, Any]]],
        verdict: str
    ) -> bytes:
        all_audio = []
        intro_audio = await self.synthesize_statement("Narrator", intro)
        all_audio.append(intro_audio)

        for round_statements in debate_rounds:
            round_audio = await self.synthesize_debate_round(round_statements)
            all_audio.extend(round_audio)

        verdict_audio = await self.synthesize_statement("Narrator", verdict)
        all_audio.append(verdict_audio)

        return b"".join(all_audio)


class ElevenLabsVoiceTool(BaseTool):
    name: str = "synthesize_voice"
    description: str = "Synthesize speech for a tribunal agent"
    parameters: Dict[str, Any] = {
        "type": "object",
        "properties": {
            "agent_name": {
                "type": "string",
                "enum": ["The Skeptic", "The Statistician", "The Methodologist", "The Ethicist", "Narrator"]
            },
            "text": {"type": "string"},
            "intensity": {"type": "number"}
        },
        "required": ["agent_name", "text"]
    }
    _synthesizer: TribunalVoiceSynthesizer = PrivateAttr(default=None)

    async def execute(self, agent_name: str, text: str, intensity: float = 0.5) -> Dict[str, Any]:
        if self._synthesizer is None:
            self._synthesizer = TribunalVoiceSynthesizer()
        audio = await self._synthesizer.synthesize_statement(agent_name, text, intensity)
        return {
            "audio_bytes": audio,
            "agent": agent_name,
            "text_length": len(text),
            "audio_size": len(audio)
        }
