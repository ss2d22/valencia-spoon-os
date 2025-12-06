import os
import json
import tempfile
from typing import Optional, Dict, Any

from spoon_toolkits.storage.aioz.aioz_tools import (
    AiozListBucketsTool,
    UploadFileToAiozTool,
    DownloadFileFromAiozTool,
    DeleteAiozObjectTool,
    GenerateAiozPresignedUrlTool,
)


class AIOZVerdictStorage:
    def __init__(self, bucket_name: Optional[str] = None):
        self.bucket = bucket_name or os.getenv("BUCKET_NAME", "adversarial-science")
        self.uploader = UploadFileToAiozTool()
        self.downloader = DownloadFileFromAiozTool()
        self.deleter = DeleteAiozObjectTool()
        self.url_generator = GenerateAiozPresignedUrlTool()
        self.bucket_lister = AiozListBucketsTool()

    async def list_buckets(self) -> str:
        result = await self.bucket_lister.execute()
        return result.output

    async def store_verdict(self, verdict: Dict[str, Any], tribunal_id: str) -> Optional[str]:
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.json', delete=False, prefix=f'verdict_{tribunal_id}_'
        ) as f:
            json.dump(verdict, f, indent=2, default=str)
            temp_path = f.name

        try:
            result = await self.uploader.execute(bucket_name=self.bucket, file_path=temp_path)
            if "Uploaded" in str(result.output) or "✅" in str(result.output):
                return f"verdicts/{tribunal_id}.json"
            return None
        finally:
            try:
                os.unlink(temp_path)
            except OSError:
                pass

    async def store_audio(self, audio_bytes: bytes, tribunal_id: str) -> Optional[str]:
        with tempfile.NamedTemporaryFile(
            mode='wb', suffix='.mp3', delete=False, prefix=f'audio_{tribunal_id}_'
        ) as f:
            f.write(audio_bytes)
            temp_path = f.name

        try:
            result = await self.uploader.execute(bucket_name=self.bucket, file_path=temp_path)
            if "Uploaded" in str(result.output) or "✅" in str(result.output):
                return f"audio/{tribunal_id}.mp3"
            return None
        finally:
            try:
                os.unlink(temp_path)
            except OSError:
                pass

    async def get_verdict(self, tribunal_id: str) -> Optional[Dict[str, Any]]:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            temp_path = f.name

        try:
            result = await self.downloader.execute(
                bucket_name=self.bucket,
                object_key=f"verdicts/{tribunal_id}.json",
                download_path=temp_path
            )
            if "downloaded" in str(result.output).lower() or "✅" in str(result.output):
                with open(temp_path, 'r') as f:
                    return json.load(f)
            return None
        finally:
            try:
                os.unlink(temp_path)
            except OSError:
                pass

    async def get_audio_url(self, tribunal_id: str, expires_in: int = 3600) -> Optional[str]:
        result = await self.url_generator.execute(
            bucket_name=self.bucket,
            object_key=f"audio/{tribunal_id}.mp3",
            expires_in=expires_in
        )
        return result.output

    async def get_verdict_url(self, tribunal_id: str, expires_in: int = 3600) -> Optional[str]:
        result = await self.url_generator.execute(
            bucket_name=self.bucket,
            object_key=f"verdicts/{tribunal_id}.json",
            expires_in=expires_in
        )
        return result.output

    async def delete_tribunal_data(self, tribunal_id: str) -> bool:
        verdict_result = await self.deleter.execute(
            bucket_name=self.bucket,
            object_key=f"verdicts/{tribunal_id}.json"
        )
        audio_result = await self.deleter.execute(
            bucket_name=self.bucket,
            object_key=f"audio/{tribunal_id}.mp3"
        )
        return "✅" in str(verdict_result.output) and "✅" in str(audio_result.output)
