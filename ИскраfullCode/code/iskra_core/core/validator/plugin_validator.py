"""Plugin-based validator architecture for ∆DΩΛ payloads.

This module defines a simple plugin mechanism that allows additional
validation rules to be defined outside of the core validator. Each
validator plugin must implement a ``validate`` method that accepts a
payload dictionary and returns a tuple ``(is_valid, errors)``.

The intention is to decouple the core schema validation from
domain‑specific checks (e.g. pain memory consistency, echo detection). By
loading external validators at runtime, the system can be extended
without modifying the core codebase. See :func:`register_plugin` and
``available_plugins`` for details.
"""

from __future__ import annotations

from typing import Callable, Dict, List, Tuple


class BaseValidator:
    """Abstract base class for validator plugins."""

    def validate(self, payload: Dict) -> Tuple[bool, List[str]]:
        """Validate the given payload.

        Args:
            payload: The ∆DΩΛ payload as a dictionary.

        Returns:
            A tuple ``(is_valid, errors)``. If ``is_valid`` is ``True`` then
            validation succeeded; otherwise ``errors`` contains human
            readable error messages.
        """
        raise NotImplementedError


# Registry for validator plugins keyed by name.
_PLUGIN_REGISTRY: Dict[str, BaseValidator] = {}


def register_plugin(name: str, plugin: BaseValidator) -> None:
    """Register a validator plugin under a given name.

    Args:
        name: Unique name for the plugin.
        plugin: An instance of a class derived from :class:`BaseValidator`.

    Raises:
        ValueError: If a plugin with the same name is already registered.
    """
    if name in _PLUGIN_REGISTRY:
        raise ValueError(f"Validator plugin '{name}' is already registered")
    _PLUGIN_REGISTRY[name] = plugin


def available_plugins() -> List[str]:
    """Return a list of registered plugin names."""
    return list(_PLUGIN_REGISTRY.keys())


def run_plugins(payload: Dict) -> Tuple[bool, List[str]]:
    """Execute all registered plugins against the payload.

    Args:
        payload: The ∆DΩΛ payload to validate.

    Returns:
        A tuple ``(overall_valid, errors)``. ``overall_valid`` is ``True``
        only if all plugins return ``is_valid=True``. ``errors`` is a
        concatenation of error messages from plugins that failed.
    """
    all_valid = True
    errors: List[str] = []
    for name, plugin in _PLUGIN_REGISTRY.items():
        is_valid, plugin_errors = plugin.validate(payload)
        if not is_valid:
            all_valid = False
            errors.extend(f"[{name}] {err}" for err in plugin_errors)
    return all_valid, errors