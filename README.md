# Adversarial Science

Four AI agents tear apart research papers, then store the verdict on Neo blockchain.

## How it works

You submit a paper. Four specialized agents analyze it:

- **The Skeptic** finds alternative explanations and confounding variables
- **The Statistician** catches p-hacking and statistical issues
- **The Methodologist** evaluates experimental design and controls
- **The Ethicist** spots conflicts of interest and bias

They debate your paper in real-time. You can jump in, challenge their findings, or ask follow-up questions. When ready, request a verdict - it gets scored, summarized, and permanently recorded on Neo blockchain.

## Tech

**SpoonOS SDK** orchestrates the multi-agent tribunal. Each agent runs independently with its own analysis prompts, then they're brought together for cross-examination rounds.

**Neo N3** stores immutable verdict hashes. Every tribunal outcome gets a transaction - paper hash, score, issues found. Can't be tampered with later.

**Mem0** keeps long-term memory of past verdicts for semantic search and pattern recognition across tribunals.

**ElevenLabs** synthesizes the debate into audio. Each agent has a distinct voice.

**FastAPI** backend, **Next.js** frontend.

## Setup

```bash
# backend
cd backend
source ../spoon-env/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn src.api.main:app --reload --port 8000

# frontend
cd frontend
npm install
npm run dev
```

## Environment

```
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
NEO_PRIVATE_KEY=
MEM0_API_KEY=
```

## API

```
POST /api/interactive/start     - start tribunal with paper text
POST /api/interactive/message   - send message during debate
POST /api/interactive/verdict   - request final verdict
GET  /api/verdicts              - list all verdicts
GET  /api/verdicts/{id}         - get verdict details
```

MIT License
