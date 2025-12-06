import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.fixture(autouse=True)
def mock_dependencies():
    with patch.dict("os.environ", {
        "ANTHROPIC_API_KEY": "test-key",
        "ELEVENLABS_API_KEY": "test-key",
        "AIOZ_ACCESS_KEY_ID": "test-key",
        "AIOZ_SECRET_ACCESS_KEY": "test-secret",
    }):
        yield


@pytest.fixture
def app():
    from src.api.main import app
    return app


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestHealthEndpoints:
    @pytest.mark.asyncio
    async def test_root(self, client):
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Adversarial Science API"
        assert "version" in data

    @pytest.mark.asyncio
    async def test_health(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


class TestTribunalSubmission:
    @pytest.mark.asyncio
    async def test_submit_text_too_short(self, client):
        response = await client.post(
            "/api/tribunal/submit-text",
            json={"text": "Too short"}
        )
        assert response.status_code == 400
        assert "100 characters" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_submit_text_valid(self, client):
        long_text = "A" * 150
        response = await client.post(
            "/api/tribunal/submit-text",
            json={"text": long_text, "title": "Test Paper"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert data["status"] == "processing"

    @pytest.mark.asyncio
    async def test_submit_pdf_wrong_type(self, client):
        response = await client.post(
            "/api/tribunal/submit",
            files={"file": ("test.txt", b"content", "text/plain")}
        )
        assert response.status_code == 400
        assert "PDF" in response.json()["detail"]


class TestTribunalStatus:
    @pytest.mark.asyncio
    async def test_status_not_found(self, client):
        response = await client.get("/api/tribunal/fake-session-id/status")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_status_after_submit(self, client):
        submit_response = await client.post(
            "/api/tribunal/submit-text",
            json={"text": "A" * 150}
        )
        session_id = submit_response.json()["session_id"]

        status_response = await client.get(f"/api/tribunal/{session_id}/status")
        assert status_response.status_code == 200
        data = status_response.json()
        assert data["session_id"] == session_id
        assert data["status"] in ["queued", "running", "completed", "failed"]


class TestVerdictEndpoints:
    @pytest.mark.asyncio
    async def test_verdict_not_found(self, client):
        response = await client.get("/api/tribunal/fake-session-id/verdict")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_verdict_not_complete(self, client):
        submit_response = await client.post(
            "/api/tribunal/submit-text",
            json={"text": "A" * 150}
        )
        session_id = submit_response.json()["session_id"]

        verdict_response = await client.get(f"/api/tribunal/{session_id}/verdict")
        assert verdict_response.status_code == 400


class TestSearchEndpoints:
    @pytest.mark.asyncio
    async def test_search_verdicts(self, client):
        with patch("src.api.main.TribunalMemory") as mock_memory:
            mock_instance = MagicMock()
            mock_instance.find_similar_papers = AsyncMock(return_value=[])
            mock_memory.return_value = mock_instance

            response = await client.get("/api/verdicts/search?query=test")
            assert response.status_code == 200
            assert "results" in response.json()

    @pytest.mark.asyncio
    async def test_verdict_stats(self, client):
        with patch("src.api.main.TribunalMemory") as mock_memory:
            mock_instance = MagicMock()
            mock_instance.get_verdict_stats = AsyncMock(return_value={
                "total_verdicts": 0,
                "average_score": 0,
            })
            mock_memory.return_value = mock_instance

            response = await client.get("/api/verdicts/stats")
            assert response.status_code == 200


class TestNeoVerification:
    @pytest.mark.asyncio
    async def test_verify_invalid_tx(self, client):
        with patch("src.api.main.NeoReader") as mock_reader:
            mock_instance = MagicMock()
            mock_instance.verify_verdict_tx = AsyncMock(return_value=None)
            mock_reader.return_value = mock_instance

            response = await client.get("/api/neo/verify/0xinvalid")
            assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
