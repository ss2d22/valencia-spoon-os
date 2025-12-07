import os
from typing import Dict, Any, Optional
from ast import literal_eval

from spoon_toolkits.crypto.neo import (
    GetAddressInfoTool,
    GetRawTransactionByTransactionHashTool,
    GetContractByHashTool,
    GetBlockByHeightTool,
    GetContractCountTool,
    ValidateAddressTool,
)


class NeoReader:
    def __init__(self, network: str = "testnet"):
        self.network = network
        self.address_tool = GetAddressInfoTool()
        self.tx_tool = GetRawTransactionByTransactionHashTool()
        self.contract_tool = GetContractByHashTool()
        self.block_tool = GetBlockByHeightTool()
        self.contract_count_tool = GetContractCountTool()
        self.validate_tool = ValidateAddressTool()

    def _parse_output(self, output: str) -> Any:
        prefix, _, payload = output.partition(": ")
        if payload:
            try:
                return literal_eval(payload)
            except (SyntaxError, ValueError):
                return payload
        return output

    async def get_address_info(self, address: str) -> Dict[str, Any]:
        result = await self.address_tool.execute(
            address=address,
            network=self.network
        )
        return self._parse_output(result.output)

    async def validate_address(self, address: str) -> Dict[str, Any]:
        result = await self.validate_tool.execute(
            address=address,
            network=self.network
        )
        return self._parse_output(result.output)

    async def get_transaction(self, tx_hash: str) -> Dict[str, Any]:
        result = await self.tx_tool.execute(
            hash=tx_hash,
            network=self.network
        )
        return self._parse_output(result.output)

    async def get_contract_info(self, contract_hash: str) -> Dict[str, Any]:
        result = await self.contract_tool.execute(
            hash=contract_hash,
            network=self.network
        )
        return self._parse_output(result.output)

    async def get_block(self, height: int) -> Dict[str, Any]:
        result = await self.block_tool.execute(
            block_height=height,
            network=self.network
        )
        return self._parse_output(result.output)

    async def get_contract_count(self) -> int:
        result = await self.contract_count_tool.execute(network=self.network)
        data = self._parse_output(result.output)
        if isinstance(data, dict):
            return data.get("count", 0)
        return 0

    async def verify_verdict_tx(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        try:
            tx_data = await self.get_transaction(tx_hash)
            if tx_data and isinstance(tx_data, dict):
                return {
                    "verified": True,
                    "tx_hash": tx_hash,
                    "block_height": tx_data.get("blockindex"),
                    "timestamp": tx_data.get("blocktime"),
                }
            return None
        except Exception:
            return None

    async def get_transaction_info(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        try:
            return await self.get_transaction(tx_hash)
        except Exception:
            return None

    async def get_recent_verdict_events(self, limit: int = 10) -> list:
        contract_hash = os.getenv("VERDICT_CONTRACT_HASH")
        if not contract_hash:
            return []
        return []
