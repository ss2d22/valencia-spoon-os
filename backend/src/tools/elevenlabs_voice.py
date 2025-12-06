import asyncio
import os
from typing import List, Dict, Any

from elevenlabs.client import ElevenLabs
from elevenlabs import VoiceSettings
from spoon_ai.tools.base import BaseTool


class TribunalVoiceSynthesizer:
    VOICE_MAP = {
        "The Skeptic": "pNInz6obpgDQGcFmaJgB",
        "The Statistician": "21m00Tcm4TlvDq8ikWAM",
        "The Methodologist": "EXAVITQu4vr4xnSDxMaL",
        "The Ethicist": "ThT5KcBeYPX3keUQqHPh",
        "Narrator": "onwK4e9ZLuTAKqWW03F9",
    }

    def __init__(self):
        api_key = os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            raise ValueError("ELEVENLABS_API_KEY not set")
        self.client = ElevenLabs(api_key=api_key)

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
    name = "synthesize_voice"
    description = "Synthesize speech for a tribunal agent"
    parameters = {
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

    def __init__(self):
        self.synthesizer = TribunalVoiceSynthesizer()

    async def execute(self, agent_name: str, text: str, intensity: float = 0.5) -> Dict[str, Any]:
        audio = await self.synthesizer.synthesize_statement(agent_name, text, intensity)
        return {
            "audio_bytes": audio,
            "agent": agent_name,
            "text_length": len(text),
            "audio_size": len(audio)
        }
