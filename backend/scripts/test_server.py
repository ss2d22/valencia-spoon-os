#!/usr/bin/env python3
import sys
import os
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))


def print_status(msg: str, success: bool = True):
    symbol = "✓" if success else "✗"
    color = "\033[92m" if success else "\033[91m"
    reset = "\033[0m"
    print(f"{color}{symbol}{reset} {msg}")


def check_python_version():
    version = sys.version_info
    print(f"\npython {version.major}.{version.minor}.{version.micro}")

    if version.major == 3 and version.minor >= 10:
        print_status("version ok")
        return True
    else:
        print_status("need python 3.10+", False)
        return False


def test_core_imports():
    print("\ncore imports...")

    modules = [
        ("typing", "typing"),
        ("asyncio", "asyncio"),
        ("uuid", "uuid"),
        ("hashlib", "hashlib"),
        ("json", "json"),
    ]

    for module, name in modules:
        try:
            __import__(module)
            print_status(name)
        except ImportError as e:
            print_status(f"{name}: {e}", False)
            return False

    return True


def test_framework_imports():
    print("\nframework imports...")

    try:
        from fastapi import FastAPI
        print_status("fastapi")
    except ImportError:
        print_status("fastapi missing", False)
        print("  pip install fastapi")
        return False

    try:
        from pydantic import BaseModel
        print_status("pydantic")
    except ImportError:
        print_status("pydantic missing", False)
        return False

    try:
        import uvicorn
        print_status("uvicorn")
    except ImportError:
        print_status("uvicorn missing (optional)", False)

    return True


def test_local_module_imports():
    print("\nlocal modules...")

    modules = [
        "src/graph/state.py",
        "src/graph/nodes.py",
        "src/graph/tribunal_graph.py",
        "src/agents/base_tribunal_agent.py",
        "src/agents/skeptic_agent.py",
        "src/tools/elevenlabs_voice.py",
        "src/tools/paper_parser.py",
        "src/storage/aioz_storage.py",
        "src/memory/tribunal_memory.py",
        "src/neo/neo_reader.py",
        "src/neo/neo_client.py",
        "src/api/main.py",
        "src/api/routes/tribunal.py",
        "src/api/routes/verdicts.py",
    ]

    for module_path in modules:
        full_path = backend_dir / module_path
        if not full_path.exists():
            print_status(f"{module_path}: not found", False)
            continue

        try:
            import py_compile
            py_compile.compile(str(full_path), doraise=True)
            print_status(module_path)
        except py_compile.PyCompileError as e:
            print_status(f"{module_path}: {e}", False)
            return False

    return True


def test_app_creation():
    print("\napp creation...")

    import sys
    from unittest.mock import MagicMock

    spoon_ai_mock = MagicMock()
    spoon_ai_mock.graph.StateGraph = MagicMock()
    spoon_ai_mock.graph.END = "END"
    sys.modules['spoon_ai'] = spoon_ai_mock
    sys.modules['spoon_ai.graph'] = spoon_ai_mock.graph
    sys.modules['spoon_ai.graph.builder'] = MagicMock()
    sys.modules['spoon_ai.graph.config'] = MagicMock()
    sys.modules['spoon_ai.chatbot'] = MagicMock()
    sys.modules['spoon_ai.mcp'] = MagicMock()
    sys.modules['spoon_ai.agents'] = MagicMock()

    spoon_toolkits_mock = MagicMock()
    sys.modules['spoon_toolkits'] = spoon_toolkits_mock
    sys.modules['spoon_toolkits.storage'] = MagicMock()
    sys.modules['spoon_toolkits.storage.aioz'] = MagicMock()
    sys.modules['spoon_toolkits.storage.aioz.aioz_tools'] = MagicMock()
    sys.modules['spoon_toolkits.memory'] = MagicMock()
    sys.modules['spoon_toolkits.crypto'] = MagicMock()
    sys.modules['spoon_toolkits.crypto.neo'] = MagicMock()

    sys.modules['elevenlabs'] = MagicMock()
    sys.modules['elevenlabs.client'] = MagicMock()

    sys.modules['fitz'] = MagicMock()

    sys.modules['neo_mamba'] = MagicMock()
    sys.modules['neo_mamba.network'] = MagicMock()
    sys.modules['neo_mamba.network.rpc'] = MagicMock()
    sys.modules['neo_mamba.wallet'] = MagicMock()

    try:
        from src.api.main import app
        print_status("app created")

        routes = [r.path for r in app.routes]
        expected = ["/", "/health", "/api/tribunal/submit"]

        for path in expected:
            if any(path in r for r in routes):
                print_status(f"route: {path}")
            else:
                print_status(f"missing: {path}", False)

        return True

    except Exception as e:
        print_status(f"app failed: {e}", False)
        import traceback
        traceback.print_exc()
        return False


def run_quick_api_test():
    print("\napi endpoints...")

    try:
        from fastapi.testclient import TestClient
        from src.api.main import app

        client = TestClient(app)

        response = client.get("/")
        if response.status_code == 200:
            print_status("GET /")
        else:
            print_status(f"GET / failed: {response.status_code}", False)

        response = client.get("/health")
        if response.status_code == 200 and response.json().get("status") == "healthy":
            print_status("GET /health")
        else:
            print_status("GET /health failed", False)

        response = client.post("/api/tribunal/submit-text", json={"text": "short"})
        if response.status_code == 400:
            print_status("validation works")
        else:
            print_status(f"validation failed: {response.status_code}", False)

        return True

    except Exception as e:
        print_status(f"api test failed: {e}", False)
        return False


def main():
    print("=" * 50)
    print("server test")
    print("=" * 50)

    all_passed = True

    all_passed &= check_python_version()
    all_passed &= test_core_imports()
    all_passed &= test_framework_imports()
    all_passed &= test_local_module_imports()
    all_passed &= test_app_creation()
    all_passed &= run_quick_api_test()

    print("\n" + "=" * 50)
    if all_passed:
        print("\033[92m✓ all tests passed\033[0m")
        print("\nto start:")
        print("  cd backend")
        print("  pip install -r requirements.txt")
        print("  cp .env.example .env")
        print("  uvicorn src.api.main:app --reload")
    else:
        print("\033[91m✗ some tests failed\033[0m")
        print("\nfix the issues above first")
    print("=" * 50)

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
