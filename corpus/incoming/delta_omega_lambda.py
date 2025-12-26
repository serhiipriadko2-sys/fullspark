from typing import Tuple, Dict, Any, List

def validate_sift_block(block: Dict[str, Any]) -> Tuple[bool, str]:
    if not isinstance(block, dict):
        return False, "D item is not a dict"
    keys = {"source", "inference", "fact", "trace"}
    if not keys.issubset(block.keys()):
        return False, f"D item missing keys: {keys - set(block.keys())}"
    if not isinstance(block["source"], str) or not block["source"]:
        return False, "D.source is invalid"
    if not isinstance(block["inference"], str) or not block["inference"]:
        return False, "D.inference is empty"
    if block["fact"] not in [True, False, "uncertain"]:
        return False, "D.fact has invalid value"
    if not isinstance(block["trace"], str):
        return False, "D.trace is missing"
    return True, ""

def validate_delta_omega_lambda(delta_block: Dict[str, Any]) -> Tuple[bool, List[str]]:
    errors: List[str] = []
    if "∆" not in delta_block or not isinstance(delta_block["∆"], str) or not delta_block["∆"]:
        errors.append("∆ is missing or empty")
    if "D" not in delta_block or not isinstance(delta_block["D"], list):
        errors.append("D is missing or not a list")
    else:
        for i, block in enumerate(delta_block["D"]):
            ok, msg = validate_sift_block(block)
            if not ok:
                errors.append(f"D[{i}] invalid: {msg}")
    omega = delta_block.get("Ω")
    if not isinstance(omega, (int, float)) or not (0.0 <= omega <= 1.0):
        errors.append(f"Ω is missing or invalid: {omega}. Must be a float between 0.0 and 1.0.")
    if "Λ" not in delta_block or not isinstance(delta_block["Λ"], str) or not delta_block["Λ"]:
        errors.append("Λ is missing or empty")
    return len(errors) == 0, errors
