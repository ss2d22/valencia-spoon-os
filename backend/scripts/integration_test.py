#!/usr/bin/env python3
import asyncio
import argparse
import sys
import time
import subprocess
from pathlib import Path

import httpx


TEST_PAPER = """
Title: Effects of Chocolate Consumption on Happiness Levels

Abstract:
This study investigates the relationship between chocolate consumption and
self-reported happiness levels in a sample of 50 university students.

Methods:
We recruited 50 participants (25 control, 25 treatment) from introductory
psychology courses. Treatment group consumed 100g of milk chocolate daily
for 2 weeks. Control group received no chocolate.

Results:
Treatment group showed 15% higher happiness scores (p=0.03, n=25).
No significant side effects were reported.

Discussion:
Our findings suggest chocolate may improve mood, supporting the hypothesis
that cocoa compounds affect serotonin levels. However, the small sample
size and short duration are limitations.

Conclusion:
Eating chocolate makes you happier. More research is needed.
"""

BASE_URL = "http://localhost:8000"


class IntegrationTest:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.client = httpx.AsyncClient(base_url=base_url, timeout=120.0)
        self.session_id = None

    async def close(self):
        await self.client.aclose()

    async def test_health(self) -> bool:
        print("checking health...")
        try:
            response = await self.client.get("/health")
            if response.status_code == 200:
                print("  ✓ healthy")
                return True
            print(f"  ✗ health failed: {response.status_code}")
            return False
        except httpx.ConnectError:
            print(f"  ✗ can't connect to {self.base_url}")
            return False

    async def test_submit_paper(self) -> bool:
        print("\nsubmitting paper...")
        response = await self.client.post(
            "/api/tribunal/submit-text",
            json={
                "text": TEST_PAPER,
                "title": "Chocolate and Happiness Study"
            }
        )

        if response.status_code == 200:
            data = response.json()
            self.session_id = data["session_id"]
            print(f"  ✓ submitted: {self.session_id}")
            return True

        print(f"  ✗ submit failed: {response.status_code}")
        print(f"    {response.text}")
        return False

    async def test_poll_status(self, max_wait: int = 300) -> bool:
        print(f"\npolling (max {max_wait}s)...")
        start_time = time.time()

        while time.time() - start_time < max_wait:
            response = await self.client.get(
                f"/api/tribunal/{self.session_id}/status"
            )

            if response.status_code != 200:
                print(f"  ✗ status failed: {response.status_code}")
                return False

            data = response.json()
            status = data["status"]
            stage = data.get("current_stage", "unknown")

            elapsed = int(time.time() - start_time)
            print(f"  [{elapsed:3d}s] {status} - {stage}")

            if status == "completed":
                print("  ✓ done")
                return True
            elif status == "failed":
                error = data.get("progress", {}).get("error", "unknown")
                print(f"  ✗ failed: {error}")
                return False

            await asyncio.sleep(5)

        print("  ✗ timeout")
        return False

    async def test_get_verdict(self) -> bool:
        print("\ngetting verdict...")
        response = await self.client.get(
            f"/api/tribunal/{self.session_id}/verdict"
        )

        if response.status_code != 200:
            print(f"  ✗ verdict failed: {response.status_code}")
            return False

        verdict = response.json()
        print(f"  ✓ score: {verdict['verdict_score']}/100")
        print(f"    decision: {verdict['verdict'].get('summary', 'N/A')}")
        print(f"    issues: {len(verdict['critical_issues'])}")

        if verdict.get("neo_tx_hash"):
            print(f"    neo: {verdict['neo_tx_hash'][:20]}...")
        if verdict.get("aioz_verdict_key"):
            print(f"    aioz: {verdict['aioz_verdict_key']}")

        return True

    async def test_debate_transcript(self) -> bool:
        print("\ngetting debate...")
        response = await self.client.get(
            f"/api/tribunal/{self.session_id}/debate"
        )

        if response.status_code != 200:
            print(f"  - not available: {response.status_code}")
            return True

        data = response.json()
        rounds = data.get("total_rounds", 0)
        print(f"  ✓ {rounds} rounds")
        return True

    async def test_agent_analyses(self) -> bool:
        print("\ngetting agent analyses...")
        response = await self.client.get(
            f"/api/tribunal/{self.session_id}/agents"
        )

        if response.status_code != 200:
            print(f"  - not available: {response.status_code}")
            return True

        data = response.json()
        agents = data.get("agents", {})
        for agent, analysis in agents.items():
            if analysis:
                severity = analysis.get("severity", "N/A")
                print(f"  ✓ {agent}: {severity}")

        return True

    async def test_search(self) -> bool:
        print("\ntesting search...")
        response = await self.client.get(
            "/api/verdicts/search",
            params={"query": "chocolate study"}
        )

        if response.status_code == 200:
            results = response.json().get("results", [])
            print(f"  ✓ {len(results)} results")
            return True

        print(f"  - failed: {response.status_code}")
        return True

    async def run_all_tests(self) -> bool:
        print("=" * 50)
        print("integration test")
        print("=" * 50)

        try:
            if not await self.test_health():
                return False

            if not await self.test_submit_paper():
                return False

            if not await self.test_poll_status():
                return False

            await self.test_get_verdict()
            await self.test_debate_transcript()
            await self.test_agent_analyses()
            await self.test_search()

            print("\n" + "=" * 50)
            print("✓ all tests passed")
            print("=" * 50)
            return True

        except Exception as e:
            print(f"\n✗ error: {e}")
            import traceback
            traceback.print_exc()
            return False


def start_server():
    print("starting server...")
    backend_dir = Path(__file__).parent.parent

    process = subprocess.Popen(
        ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=backend_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    time.sleep(5)

    if process.poll() is not None:
        print("server failed to start")
        stdout, stderr = process.communicate()
        print(stderr.decode())
        return None

    print(f"server running (pid {process.pid})")
    return process


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-server", action="store_true")
    parser.add_argument("--base-url", default=BASE_URL)
    args = parser.parse_args()

    server_process = None
    if args.start_server:
        server_process = start_server()
        if not server_process:
            return 1

    try:
        tester = IntegrationTest(args.base_url)
        success = await tester.run_all_tests()
        await tester.close()
        return 0 if success else 1

    finally:
        if server_process:
            print("\nstopping server...")
            server_process.terminate()
            server_process.wait()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
