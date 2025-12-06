from typing import Any
from boa3.builtin.compile_time import public, metadata, NeoMetadata
from boa3.builtin.interop import runtime, storage
from boa3.builtin.interop.runtime import check_witness
from boa3.builtin.type import UInt160
from boa3.builtin.nativecontract.contractmanagement import ContractManagement


@metadata
def manifest_metadata() -> NeoMetadata:
    meta = NeoMetadata()
    meta.name = "Adversarial Science Verdict Registry"
    meta.author = "SpoonOS Hackathon Team"
    meta.description = "Immutable registry of AI tribunal verdicts"
    meta.version = "1.0.0"
    return meta


OWNER_KEY = b"owner"
VERDICT_COUNT_KEY = b"verdict_count"
VERDICT_PREFIX = b"v:"
PAPER_INDEX_PREFIX = b"p:"
TRIBUNAL_INDEX_PREFIX = b"t:"


@public
def _deploy(data: Any, update: bool):
    if not update:
        owner = runtime.calling_script_hash
        storage.put(OWNER_KEY, owner)
        storage.put(VERDICT_COUNT_KEY, 0)


@public
def update(nef_file: bytes, manifest: bytes):
    owner = UInt160(storage.get(OWNER_KEY))
    if not check_witness(owner):
        raise Exception("Not authorized")
    ContractManagement.update(nef_file, manifest)


@public
def destroy():
    owner = UInt160(storage.get(OWNER_KEY))
    if not check_witness(owner):
        raise Exception("Not authorized")
    ContractManagement.destroy()


@public(safe=True)
def get_owner() -> UInt160:
    return UInt160(storage.get(OWNER_KEY))


@public
def transfer_ownership(new_owner: UInt160) -> bool:
    old_owner = UInt160(storage.get(OWNER_KEY))
    if not check_witness(old_owner):
        return False
    storage.put(OWNER_KEY, new_owner)
    return True


@public
def record_verdict(
    tribunal_id: str,
    paper_hash: str,
    verdict_hash: str,
    verdict_score: int,
    critical_issue_count: int,
    aioz_key: str
) -> int:
    owner = UInt160(storage.get(OWNER_KEY))
    if not check_witness(owner):
        raise Exception("Not authorized")

    count_bytes = storage.get(VERDICT_COUNT_KEY)
    verdict_count = 0 if len(count_bytes) == 0 else count_bytes.to_int()
    verdict_id = verdict_count + 1
    storage.put(VERDICT_COUNT_KEY, verdict_id)

    timestamp = runtime.time

    verdict_data = tribunal_id + "|" + paper_hash + "|" + verdict_hash + "|" + str(verdict_score) + "|" + str(critical_issue_count) + "|" + aioz_key + "|" + str(timestamp)

    verdict_key = VERDICT_PREFIX + verdict_id.to_bytes()
    storage.put(verdict_key, verdict_data)

    paper_index_key = PAPER_INDEX_PREFIX + paper_hash.to_bytes()
    storage.put(paper_index_key, verdict_id)

    tribunal_index_key = TRIBUNAL_INDEX_PREFIX + tribunal_id.to_bytes()
    storage.put(tribunal_index_key, verdict_id)

    return verdict_id


@public(safe=True)
def get_verdict(verdict_id: int) -> str:
    verdict_key = VERDICT_PREFIX + verdict_id.to_bytes()
    data = storage.get(verdict_key)
    if len(data) == 0:
        return ""
    return data.to_str()


@public(safe=True)
def get_verdict_by_paper(paper_hash: str) -> str:
    paper_index_key = PAPER_INDEX_PREFIX + paper_hash.to_bytes()
    verdict_id_bytes = storage.get(paper_index_key)
    if len(verdict_id_bytes) == 0:
        return ""
    verdict_id = verdict_id_bytes.to_int()
    return get_verdict(verdict_id)


@public(safe=True)
def get_verdict_by_tribunal(tribunal_id: str) -> str:
    tribunal_index_key = TRIBUNAL_INDEX_PREFIX + tribunal_id.to_bytes()
    verdict_id_bytes = storage.get(tribunal_index_key)
    if len(verdict_id_bytes) == 0:
        return ""
    verdict_id = verdict_id_bytes.to_int()
    return get_verdict(verdict_id)


@public(safe=True)
def get_verdict_count() -> int:
    count_bytes = storage.get(VERDICT_COUNT_KEY)
    if len(count_bytes) == 0:
        return 0
    return count_bytes.to_int()


@public(safe=True)
def verify_verdict(verdict_id: int, expected_hash: str) -> bool:
    verdict_key = VERDICT_PREFIX + verdict_id.to_bytes()
    data = storage.get(verdict_key)
    if len(data) == 0:
        return False
    verdict_str = data.to_str()
    return expected_hash in verdict_str
