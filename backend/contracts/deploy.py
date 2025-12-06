import os
import sys
import json
import asyncio
import argparse
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

from neo3.wallet.account import Account
from neo3.api.noderpc import NeoRpcClient


NETWORKS = {
    "mainnet": {"rpc": os.getenv("NEO_RPC_MAINNET", "https://mainnet1.neo.coz.io:443")},
    "testnet": {"rpc": os.getenv("NEO_RPC_TESTNET", "http://seed1t5.neo.org:20332")},
}

GAS_CONTRACT = "0xd2a4cff31913016155e38e474a2c06d08be276cf"
NEO_CONTRACT = "0xef4073a0f2b305a38ec4050e4d3d28bc40ea63f5"


def compile_contract(source_path: str) -> tuple[bytes, dict]:
    from boa3.boa3 import Boa3

    print(f"compiling {source_path}")
    output_path = source_path.replace(".py", ".nef")
    manifest_path = source_path.replace(".py", ".manifest.json")

    Boa3.compile_and_save(source_path, output_path)

    with open(output_path, "rb") as f:
        nef_bytes = f.read()
    with open(manifest_path, "r") as f:
        manifest = json.load(f)

    print(f"done - {len(nef_bytes)} bytes")
    return nef_bytes, manifest


async def check_balance(network: str, address: str):
    config = NETWORKS.get(network)

    async with NeoRpcClient(config["rpc"]) as client:
        balances = await client.get_nep17_balances(address)

        gas = neo = 0
        for b in balances.balances:
            if b.asset_hash == GAS_CONTRACT:
                gas = int(b.amount) / 10**8
            elif b.asset_hash == NEO_CONTRACT:
                neo = int(b.amount)

        print(f"{address} ({network})")
        print(f"  neo: {neo}")
        print(f"  gas: {gas:.4f}")

        if gas < 10:
            print(f"\nneed ~10 gas to deploy")
            print(f"get testnet gas: https://neowish.ngd.network/")
        else:
            print(f"\nready to deploy")

        return gas


def save_deployment(network: str, contract_hash: str, manifest: dict):
    info = {
        "network": network,
        "contract_hash": contract_hash,
        "name": manifest.get("name", "VerdictRegistry"),
        "deployed_at": __import__("datetime").datetime.now().isoformat(),
    }

    path = Path(__file__).parent / f"deployment_{network}.json"
    with open(path, "w") as f:
        json.dump(info, f, indent=2)
    print(f"saved: {path}")


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--network", choices=["mainnet", "testnet"], default="testnet")
    parser.add_argument("--private-key", default=None)
    parser.add_argument("--compile-only", action="store_true")
    parser.add_argument("--check-balance", action="store_true")

    args = parser.parse_args()
    wif = args.private_key or os.getenv("NEO_PRIVATE_KEY")

    if not wif:
        print("error: NEO_PRIVATE_KEY required")
        sys.exit(1)

    account = Account.from_wif(wif)

    if args.check_balance:
        await check_balance(args.network, account.address)
        return

    source = str(Path(__file__).parent / "verdict_registry.py")

    try:
        nef, manifest = compile_contract(source)
    except Exception as e:
        print(f"compile failed: {e}")
        sys.exit(1)

    if args.compile_only:
        return

    print(f"\nfiles ready:")
    print(f"  {source.replace('.py', '.nef')}")
    print(f"  {source.replace('.py', '.manifest.json')}")
    print(f"\ndeploy via neon wallet or neo-cli")
    print(f"then add VERDICT_CONTRACT_HASH to .env")


if __name__ == "__main__":
    asyncio.run(main())
