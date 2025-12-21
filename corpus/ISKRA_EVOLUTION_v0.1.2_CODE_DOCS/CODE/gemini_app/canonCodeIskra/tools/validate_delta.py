"""
validate_delta.py
-------------------

This tool validates Markdown files for the presence and correctness of
``∆DΩΛ`` blocks, which are the heart of the Iskra Canon. It checks
that each block contains the required fields (`∆`, `D (SIFT)`, `Ω`,
and `Λ`) and ensures that the Lambda-Latch field follows the required
format `{action, owner, condition, <=24h}`.

Usage:
    python tools/validate_delta.py path/to/file1.md path/to/file2.md ...

On success, the script prints a summary and exits with code 0. On
failure, it prints all errors and exits with code 1. This script is
primarily used in CI to ensure that documentation changes do not
violate the Canon's formatting rules.

This file is a simplified version of the same validator defined in
the top-level project; it exists here so that the script can be
packaged inside the final deliverable for user convenience.
"""

import re
import argparse
import sys
from typing import List

from pydantic import BaseModel, field_validator, ValidationError


# Regular expression used to validate the Lambda-Latch format. This
# matches strings like `{action: "X", owner: "User", condition: "Y", <=24h: true}`.
LAMBDA_LATCH_REGEX = re.compile(r"\{.*action.*,.+owner.*,.+condition.*,.+<=.*\}")


class AdomlBlockValidator(BaseModel):
    """Pydantic model used to validate a single ∆DΩΛ block."""

    delta: str
    sift: str
    omega: float
    lambda_latch: str

    @field_validator("lambda_latch")
    def validate_lambda_latch_format(cls, v: str) -> str:
        if not LAMBDA_LATCH_REGEX.match(v):
            raise ValueError(
                "Lambda-Latch должен быть в формате {action, owner, condition, <=24h}"
            )
        return v


# Regular expressions for parsing the Markdown blocks. These expressions
# look for bold markers followed by the names of the fields. They
# capture the text that follows on the same line.
BLOCK_RE = re.compile(r"(\*\*∆\*\*.*?\*\*∆DΩΛ\*\*)", re.DOTALL)
DELTA_RE = re.compile(r"^\*\*∆\*\*: *(.+)$", re.MULTILINE)
SIFT_RE = re.compile(r"^\*\*D \(SIFT\)\*\*: *(.+)$", re.MULTILINE)
OMEGA_RE = re.compile(r"^\*\*Ω\*\*: *([0-9\.]+)", re.MULTILINE)
LAMBDA_RE = re.compile(r"^\*\*Λ\*\*: *(.+)$", re.MULTILINE)


def parse_and_validate(content: str) -> List[str]:
    """Finds and validates all ∆DΩΛ blocks in a Markdown file.

    Args:
        content: The full text of the Markdown file.

    Returns:
        A list of error messages. If empty, validation succeeded.
    """
    errors: List[str] = []
    blocks = BLOCK_RE.findall(content)
    if not blocks:
        return ["Ошибка: Блок ∆DΩΛ (формат **∆**…**∆DΩΛ**) не найден в файле."]

    for i, block_str in enumerate(blocks):
        try:
            delta_match = DELTA_RE.search(block_str)
            sift_match = SIFT_RE.search(block_str)
            omega_match = OMEGA_RE.search(block_str)
            lambda_match = LAMBDA_RE.search(block_str)

            if not all([delta_match, sift_match, omega_match, lambda_match]):
                raise AttributeError("Не все поля (∆, D, Ω, Λ) найдены.")

            data = {
                "delta": delta_match.group(1).strip(),
                "sift": sift_match.group(1).strip(),
                "omega": float(omega_match.group(1).strip()),
                "lambda_latch": lambda_match.group(1).strip(),
            }
            AdomlBlockValidator.model_validate(data)
        except ValidationError as e:
            errors.append(f"Блок #{i + 1} НЕ ВАЛИДЕН:\n{e}\n")
        except AttributeError as e:
            errors.append(f"Блок #{i + 1}: Ошибка парсинга: {e}.\n")
        except Exception as e:
            errors.append(f"Блок #{i + 1}: Неизвестная ошибка: {e}\n")
    return errors


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Проверяет Markdown-файлы на соответствие структуре ∆DΩΛ."
    )
    parser.add_argument("files", nargs="+", help="Пути к .md файлам для проверки.")
    args = parser.parse_args()

    all_errors: List[str] = []
    for filepath in args.files:
        print(f"Проверка файла: {filepath}")
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            errors = parse_and_validate(content)
            if errors:
                all_errors.extend([f"В {filepath}:\n{e}" for e in errors])
        except FileNotFoundError:
            all_errors.append(f"Файл не найден: {filepath}\n")
    if all_errors:
        print("\n--- 🚨 Найдены ошибки ∆DΩΛ! ---")
        for err in all_errors:
            print(err)
        sys.exit(1)
    print("\n--- ✅ Валидация прошла успешно. Все блоки ∆DΩΛ корректны. ---")
    sys.exit(0)


if __name__ == "__main__":
    main()