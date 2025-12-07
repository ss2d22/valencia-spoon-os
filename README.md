# Adversarial Science Tribunal

Four AI agents tear apart research papers in real-time debate, then store the verdict on Neo blockchain.

## The Problem

Peer review is broken. Papers take months to review, reviewers are overworked, and bad science still slips through. We built a system that catches methodological issues instantly - not to replace human reviewers, but to give researchers immediate feedback before they even submit.

## How It Works

Upload a paper. Four specialized agents analyze it in parallel:

- **The Skeptic** - hunts for alternative explanations and confounding variables
- **The Statistician** - catches p-hacking, underpowered studies, and statistical misuse
- **The Methodologist** - evaluates experimental design, controls, and reproducibility
- **The Ethicist** - flags conflicts of interest, consent issues, and disclosure problems

They don't just analyze - they debate. Each agent challenges the others' findings. You can jump in anytime, ask questions, push back on their conclusions, or request clarification.

When ready, request a verdict. The system scores your paper 0-100, lists critical issues, and permanently records everything on Neo blockchain.

## Tech Stack

**SpoonOS SDK** - Orchestrates the multi-agent system. Each agent runs independently with specialized prompts, then coordinated for cross-examination.

**Neo N3 Blockchain** - Every verdict gets recorded on-chain. Paper hash, score, critical issues - all immutable and timestamped.

**Mem0** - Long-term memory layer with semantic embeddings. Find similar papers, track issues across your research, spot patterns.

**ElevenLabs** - Voice synthesis for the debate. Each agent has a distinct voice. Supports real-time voice interaction.

**Language Support** - Full English and Chinese. Agents analyze Chinese papers in Chinese with localized terminology.

**FastAPI + Next.js** - Python backend for orchestration, React frontend with real-time updates.

## Setup

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn src.api.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## Environment Variables

```
ANTHROPIC_API_KEY=     # Claude for agent reasoning
ELEVENLABS_API_KEY=    # Voice synthesis
NEO_PRIVATE_KEY=       # Neo blockchain signing
MEM0_API_KEY=          # Long-term memory
```

## API

```
POST /api/interactive/start-pdf   Start with PDF upload
POST /api/interactive/start       Start with text
POST /api/interactive/{id}/message  Send message during debate
POST /api/interactive/{id}/request-verdict  Get final verdict
GET  /api/verdicts                 List all verdicts
GET  /api/verdicts/{id}            Verdict details
GET  /api/verdicts/by-paper        Papers grouped by version
POST /api/voice/synthesize         Text to speech
POST /api/voice/transcribe         Speech to text
```

MIT License
