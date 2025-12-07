# Adversarial Science

AI tribunal that tears apart research papers. Four specialized agents debate your paper's flaws, then store an immutable verdict on Neo blockchain.

## What it does

1. Upload a paper (PDF or text)
2. Four AI agents analyze it from different angles:
   - **The Skeptic** - questions everything, finds alternative explanations
   - **The Statistician** - audits numbers, catches p-hacking
   - **The Methodologist** - evaluates experimental design
   - **The Ethicist** - identifies bias and conflicts of interest
3. Agents debate each other across 3 rounds
4. Voice synthesis creates an audio recording of the debate
5. Final verdict gets stored on Neo blockchain + Mem0

## Quick Start

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# fill in your API keys

uvicorn src.api.main:app --reload
```

## API

- `POST /api/tribunal/submit` - upload PDF
- `POST /api/tribunal/submit-text` - submit text directly
- `GET /api/tribunal/{session_id}/status` - check progress
- `GET /api/tribunal/{session_id}/verdict` - get results
- `GET /api/tribunal/{session_id}/audio` - download debate audio

## Stack

- SpoonOS SDK for agent orchestration
- ElevenLabs for voice synthesis
- Neo N3 for immutable verdict storage
- Mem0 for verdict memory and semantic search
- FastAPI backend

## Environment Variables

```
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
NEO_PRIVATE_KEY=
VERDICT_CONTRACT_HASH=
MEM0_API_KEY=
```

## Smart Contract

The verdict registry lives in `backend/contracts/`. Compile with neo3-boa (requires Python 3.11-3.12):

```bash
cd backend/contracts
python deploy.py --compile-only
python deploy.py --check-balance --network testnet
```

## License

MIT
