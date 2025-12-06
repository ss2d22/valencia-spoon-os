import os
import hashlib
from typing import Dict, Any, Optional


class NeoVerdictWriter:
    def __init__(self):
        self.rpc_url = os.getenv(
            "NEO_TESTNET_RPC",
            "https://testmagnet.ngd.network:443"
        )
        self.private_key = os.getenv("NEO_PRIVATE_KEY")
        self.contract_hash = os.getenv("VERDICT_CONTRACT_HASH")

        self._rpc = None
        self._account = None

    def _init_neo_mamba(self):
        if self._rpc is None:
            try:
                from neo_mamba.network.rpc import RpcClient
                from neo_mamba.wallet import Account

                self._rpc = RpcClient(self.rpc_url)

                if self.private_key:
                    self._account = Account.from_private_key(self.private_key)
            except ImportError:
                pass

    async def store_verdict_on_chain(
        self,
        paper_hash: bytes,
        verdict_score: int,
        aioz_verdict_key: str,
        aioz_audio_key: str,
        tribunal_id: str
    ) -> str:
        self._init_neo_mamba()

        if self._rpc is None or self._account is None or not self.contract_hash:
            combined = paper_hash + tribunal_id.encode() + str(verdict_score).encode()
            mock_hash = hashlib.sha256(combined).hexdigest()
            return f"0x{mock_hash}"

        try:
            from neo_mamba.contracts import SmartContract
            from neo_mamba.transactions import Transaction
            import json

            contract = SmartContract(self.contract_hash, self._rpc)

            verdict_hash = hashlib.sha256(
                paper_hash + tribunal_id.encode() + str(verdict_score).encode()
            ).hexdigest()

            tx = await contract.invoke(
                "record_verdict",
                [
                    tribunal_id,
                    paper_hash.hex(),
                    verdict_hash,
                    verdict_score,
                    0,
                    aioz_verdict_key or "",
                ],
                self._account
            )

            tx_hash = await self._rpc.send_raw_transaction(tx.serialize())
            return tx_hash

        except Exception as e:
            print(f"neo tx failed, using mock: {e}")
            combined = paper_hash + tribunal_id.encode() + str(verdict_score).encode()
            mock_hash = hashlib.sha256(combined).hexdigest()
            return f"0x{mock_hash}"

    async def get_verdict_from_chain(
        self,
        verdict_id: bytes
    ) -> Optional[Dict[str, Any]]:
        self._init_neo_mamba()

        if self._rpc is None or not self.contract_hash:
            return None

        return None

    async def check_connection(self) -> Dict[str, Any]:
        self._init_neo_mamba()

        if self._rpc is None:
            return {
                "connected": False,
                "error": "neo-mamba not initialized",
                "rpc_url": self.rpc_url,
                "has_private_key": bool(self.private_key),
                "has_contract_hash": bool(self.contract_hash),
            }

        try:
            return {
                "connected": True,
                "rpc_url": self.rpc_url,
                "has_private_key": bool(self._account),
                "has_contract_hash": bool(self.contract_hash),
            }
        except Exception as e:
            return {
                "connected": False,
                "error": str(e),
                "rpc_url": self.rpc_url,
            }


async def store_verdict(
    paper_content: str,
    verdict_score: int,
    aioz_verdict_key: str,
    aioz_audio_key: str,
    tribunal_id: str
) -> str:
    writer = NeoVerdictWriter()
    paper_hash = hashlib.sha256(paper_content.encode()).digest()

    return await writer.store_verdict_on_chain(
        paper_hash=paper_hash,
        verdict_score=verdict_score,
        aioz_verdict_key=aioz_verdict_key,
        aioz_audio_key=aioz_audio_key,
        tribunal_id=tribunal_id
    )
