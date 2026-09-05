import json


def test_schema_probe_storage_and_address(direct_vm, direct_deploy, direct_alice):
    direct_vm.check_pickling = True
    contract = direct_deploy("probes/schema_probe.py")

    assert contract.echo_address(direct_alice) == direct_alice
    contract.add_item("field", 3)
    assert contract.counter == 1
    assert contract.items[0].label == "field"
    assert contract.items[0].count == 3


def test_schema_probe_nondeterministic_wrapper(direct_vm, direct_deploy):
    direct_vm.check_pickling = True
    direct_vm.mock_llm(r"Return JSON with exactly one field named label", json.dumps({"label": "OK"}))
    contract = direct_deploy("probes/schema_probe.py")

    contract.classify("untrusted payload")
