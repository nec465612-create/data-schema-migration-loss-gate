import hashlib
import json

import pytest


def canonical(value):
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )


def as_json(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def address_text(address):
    if isinstance(address, bytes):
        return "0x" + address.hex()
    return str(address).lower()


def field(field_id, field_type="TEXT", required=True, meaning="stable", values=None):
    return {
        "id": field_id,
        "type": field_type,
        "required": required,
        "meaning": meaning,
        "values": [] if values is None else values,
    }


def schema(old, new):
    return {"old": old, "new": new}


def mapping(old_id, new_id, transform):
    return {"old_id": old_id, "new_id": new_id, "transform": transform}


def response(rows, defaults=None):
    return {"mapping": rows, "defaults": [] if defaults is None else defaults}


def deploy_case(direct_vm, direct_deploy, direct_alice, direct_bob, base):
    contract = direct_deploy("contracts/main.py")
    direct_vm.sender = direct_alice
    case_id = contract.create_schema_case(
        "a" * 32,
        direct_bob,
        as_json(base),
        0,
    )
    return contract, case_id


def advance_to_frozen(direct_vm, contract, case_id, direct_alice, direct_bob, response_json):
    direct_vm.sender = direct_alice
    contract.lock_schemas(case_id, 1)
    direct_vm.sender = direct_bob
    contract.put_mapping(case_id, response_json, 2)
    contract.freeze_mapping(case_id, 3)


def test_create_two_party_case_and_exact_historical_readback(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    direct_vm.check_pickling = True
    base = schema(
        [field("name")],
        [field("name")],
    )
    contract, case_id = deploy_case(
        direct_vm, direct_deploy, direct_alice, direct_bob, base
    )

    assert int(case_id) == 1
    assert int(contract.get_count()) == 1
    assert int(contract.get_id_by_nonce(direct_alice, "a" * 32)) == 1
    case = json.loads(contract.get_case(case_id))
    assert case["phase"] == "BASE_DRAFT"
    assert case["id"] == "1"
    assert case["revision"] == "1"
    assert case["parent"] == "0"
    assert json.loads(contract.get_version(case_id, 1))["revision"] == "1"
    assert json.loads(contract.list_cases(1, 4)) == {"ids": ["1"], "next": "0"}
    assert json.loads(contract.list_actor(direct_alice, 0, 4)) == {
        "ids": ["1"],
        "next": "0",
    }

    # Identical create replay is idempotent; a changed payload conflicts.
    direct_vm.sender = direct_alice
    assert (
        int(
            contract.create_schema_case(
                "a" * 32, direct_bob, as_json(base), 0
            )
        )
        == 1
    )
    changed = schema([field("name", meaning="changed")], [field("name")])
    with pytest.raises(Exception, match="NONCE_CONFLICT"):
        contract.create_schema_case("a" * 32, direct_bob, as_json(changed), 0)

    record = json.loads(contract.get_version(case_id, 1))
    expected_hash = hashlib.sha256(
        canonical(
            [
                "a" * 32,
                address_text(direct_bob),
                base,
                "0",
            ]
        ).encode("utf-8")
    ).hexdigest()
    assert record["create_hash"] == expected_hash
    assert record["last_operation"] == {
        "method": "create_schema_case",
        "caller": address_text(direct_alice),
        "args_hash": expected_hash,
    }


def test_crlf_input_normalizes_before_freezing_and_hashing(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    base = schema(
        [field("name", meaning="line one\r\nline two")],
        [field("name", meaning="line one\r\nline two")],
    )
    raw_crlf_json = as_json(base).replace(",", ",\r\n")
    contract = direct_deploy("contracts/main.py")
    direct_vm.sender = direct_alice
    case_id = contract.create_schema_case(
        "b" * 32,
        direct_bob,
        raw_crlf_json,
        0,
    )

    record = json.loads(contract.get_case(case_id))
    frozen_base = json.loads(record["base"])
    assert frozen_base["old"][0]["meaning"] == "line one\nline two"
    assert frozen_base["new"][0]["meaning"] == "line one\nline two"

    direct_vm.sender = direct_alice
    contract.replace_schemas(case_id, as_json({
        "old": [field("name", meaning="line one\nline two")],
        "new": [field("name", meaning="line one\nline two")],
    }), 1)
    replaced = json.loads(contract.get_case(case_id))
    assert json.loads(replaced["base"]) == frozen_base


def test_drop_of_optional_field_is_loss_and_commits_history(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    direct_vm.check_pickling = True
    base = schema(
        [field("legacy", required=False)],
        [field("current", required=False)],
    )
    contract, case_id = deploy_case(
        direct_vm, direct_deploy, direct_alice, direct_bob, base
    )
    response_json = as_json(response([mapping("legacy", "", "DROP")]))
    advance_to_frozen(
        direct_vm, contract, case_id, direct_alice, direct_bob, response_json
    )

    direct_vm.sender = direct_alice
    contract.evaluate_migration(case_id, 4)
    record = json.loads(contract.get_case(case_id))
    historical = json.loads(contract.get_version(case_id, 5))
    assert record == historical
    assert record["phase"] == "DONE"
    assert record["outcome"] == "LOSS_FOUND"
    assert record["accepted_attempts"] == 1
    assert record["result"] == {"v": 1, "meanings": ["SKIP_DROP"]}
    assert record["last_operation"]["method"] == "evaluate_migration"
    assert contract.get_version(case_id, 6) == "null"


def test_invalid_mapping_and_stale_revision_do_not_mutate(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    direct_vm.check_pickling = True
    base = schema([field("name")], [field("name")])
    contract, case_id = deploy_case(
        direct_vm, direct_deploy, direct_alice, direct_bob, base
    )
    before = contract.get_case(case_id)

    direct_vm.sender = direct_alice
    with pytest.raises(Exception, match="STALE_REVISION"):
        contract.lock_schemas(case_id, 99)
    assert contract.get_case(case_id) == before

    contract.lock_schemas(case_id, 1)
    direct_vm.sender = direct_bob
    invalid = response(
        [
            mapping("name", "name", "IDENTITY"),
            mapping("name", "name", "IDENTITY"),
        ]
    )
    before = contract.get_case(case_id)
    with pytest.raises(Exception, match="BAD_MAPPING"):
        contract.put_mapping(case_id, as_json(invalid), 2)
    assert contract.get_case(case_id) == before


@pytest.mark.parametrize("bad_type", [[], {}, 1], ids=["list", "dict", "integer"])
def test_non_string_field_type_rejects_deterministically_without_state_change(
    direct_vm, direct_deploy, direct_alice, direct_bob, bad_type
):
    contract = direct_deploy("contracts/main.py")
    direct_vm.sender = direct_alice
    with pytest.raises(Exception, match="BAD_FIELD"):
        contract.create_schema_case(
            "c" * 32,
            direct_bob,
            as_json(schema([field("name", field_type=bad_type)], [field("name")])),
            0,
        )
    assert int(contract.get_count()) == 0


@pytest.mark.parametrize("bad_transform", [[], {}, 1], ids=["list", "dict", "integer"])
def test_non_string_mapping_transform_rejects_without_state_change(
    direct_vm, direct_deploy, direct_alice, direct_bob, bad_transform
):
    contract, case_id = deploy_case(
        direct_vm,
        direct_deploy,
        direct_alice,
        direct_bob,
        schema([field("name")], [field("name")]),
    )
    direct_vm.sender = direct_alice
    contract.lock_schemas(case_id, 1)
    direct_vm.sender = direct_bob
    before = contract.get_case(case_id)
    invalid = response([mapping("name", "name", bad_transform)])
    with pytest.raises(Exception, match="BAD_MAPPING"):
        contract.put_mapping(case_id, as_json(invalid), 2)
    assert contract.get_case(case_id) == before
    assert contract.get_version(case_id, 3) == "null"


@pytest.mark.parametrize("bad_default_id", [[], {}, 1], ids=["list", "dict", "integer"])
def test_non_string_default_id_rejects_without_state_change(
    direct_vm, direct_deploy, direct_alice, direct_bob, bad_default_id
):
    contract, case_id = deploy_case(
        direct_vm,
        direct_deploy,
        direct_alice,
        direct_bob,
        schema([field("name")], [field("name")]),
    )
    direct_vm.sender = direct_alice
    contract.lock_schemas(case_id, 1)
    direct_vm.sender = direct_bob
    before = contract.get_case(case_id)
    invalid = response(
        [mapping("name", "name", "IDENTITY")],
        defaults=[{"new_id": bad_default_id, "value": ""}],
    )
    with pytest.raises(Exception, match="BAD_DEFAULT"):
        contract.put_mapping(case_id, as_json(invalid), 2)
    assert contract.get_case(case_id) == before
    assert contract.get_version(case_id, 3) == "null"


@pytest.mark.parametrize("bad_meaning", [[], {}, 1], ids=["list", "dict", "integer"])
def test_non_string_result_meaning_rejects_without_state_change(
    direct_vm, direct_deploy, direct_alice, direct_bob, bad_meaning
):
    direct_vm.check_pickling = True
    direct_vm.mock_llm(
        r"(?s).*BEGIN_UNTRUSTED_BASE_JSON.*",
        json.dumps({"v": 1, "meanings": [bad_meaning]}),
    )
    contract, case_id = deploy_case(
        direct_vm,
        direct_deploy,
        direct_alice,
        direct_bob,
        schema([field("name")], [field("name")]),
    )
    advance_to_frozen(
        direct_vm,
        contract,
        case_id,
        direct_alice,
        direct_bob,
        as_json(response([mapping("name", "name", "IDENTITY")])),
    )
    direct_vm.sender = direct_alice
    before = contract.get_case(case_id)
    with pytest.raises(Exception, match="BAD_RESULT"):
        contract.evaluate_migration(case_id, 4)
    assert contract.get_case(case_id) == before
    assert contract.get_version(case_id, 5) == "null"


def test_semantic_same_is_lossless_with_validator_reproduction(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    direct_vm.check_pickling = True
    direct_vm.mock_llm(
        r"(?s).*BEGIN_UNTRUSTED_BASE_JSON.*",
        json.dumps({"v": 1, "meanings": ["SAME"]}),
    )
    base = schema([field("name", meaning="person name")], [field("name", meaning="person name")])
    contract, case_id = deploy_case(
        direct_vm, direct_deploy, direct_alice, direct_bob, base
    )
    advance_to_frozen(
        direct_vm,
        contract,
        case_id,
        direct_alice,
        direct_bob,
        as_json(response([mapping("name", "name", "IDENTITY")])),
    )

    direct_vm.sender = direct_bob
    contract.evaluate_migration(case_id, 4)
    record = json.loads(contract.get_case(case_id))
    assert record["phase"] == "DONE"
    assert record["outcome"] == "LOSSLESS"
    assert record["result"] == {"v": 1, "meanings": ["SAME"]}


def test_unknown_requires_cooldown_then_retries_and_exhausts(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    direct_vm.check_pickling = True
    direct_vm.mock_llm(
        r"(?s).*BEGIN_UNTRUSTED_BASE_JSON.*",
        json.dumps({"v": 1, "meanings": ["UNKNOWN"]}),
    )
    base = schema([field("name")], [field("name")])
    contract, case_id = deploy_case(
        direct_vm, direct_deploy, direct_alice, direct_bob, base
    )
    advance_to_frozen(
        direct_vm,
        contract,
        case_id,
        direct_alice,
        direct_bob,
        as_json(response([mapping("name", "name", "IDENTITY")])),
    )

    direct_vm.sender = direct_bob
    direct_vm.warp("2026-01-01T00:00:00Z")
    contract.evaluate_migration(case_id, 4)
    assert json.loads(contract.get_case(case_id))["phase"] == "UNRESOLVED"
    assert json.loads(contract.get_case(case_id))["accepted_attempts"] == 1
    with pytest.raises(Exception, match="COOLDOWN"):
        contract.retry_migration(case_id, 5)

    direct_vm.warp("2026-01-01T00:01:01Z")
    contract.retry_migration(case_id, 5)
    assert json.loads(contract.get_case(case_id))["accepted_attempts"] == 2

    direct_vm.warp("2026-01-01T00:02:02Z")
    contract.retry_migration(case_id, 6)
    record = json.loads(contract.get_case(case_id))
    assert record["phase"] == "EXHAUSTED"
    assert record["accepted_attempts"] == 3
