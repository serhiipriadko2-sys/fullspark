"""
External connectors for the Iskra agent.

This module defines classes which wrap access to external services such as
web search. The default implementation uses Bing's Web Search API via
the key defined in ``config.BING_API_KEY``. When no key is available
mock data is returned. Other connectors can be added here.
"""
from __future__ import annotations

from typing import List, Dict, Any

import httpx

from config import BING_API_KEY, BING_ENDPOINT


class ToolService:
    """Provides static methods to access external information sources."""

    @staticmethod
    async def web_search(query: str) -> List[Dict[str, str]]:
        """Query the Bing Web Search API for documents matching ``query``.

        Args:
            query: The search term.

        Returns:
            A list of dictionaries with ``snippet``, ``source_url`` and
            ``title`` keys. If the API key is missing a placeholder
            result is returned.
        """
        if not BING_API_KEY or BING_API_KEY == "your-bing-api-key-here":
            # Return a mock result when no key is configured. This
            # prevents the assistant from crashing in offline tests.
            return [
                {
                    "snippet": f"Это MOCK-результат по запросу '{query}'.",
                    "source_url": "https://example.com/mock",
                    "title": f"MOCK: {query}"
                }
            ]
        headers = {"Ocp-Apim-Subscription-Key": BING_API_KEY}
        params = {"q": query, "count": 3, "mkt": "en-US"}
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(BING_ENDPOINT, headers=headers, params=params)
                response.raise_for_status()
                data = response.json()
                pages = data.get("webPages", {}).get("value", [])
                results: List[Dict[str, str]] = []
                for page in pages:
                    results.append(
                        {
                            "snippet": page.get("snippet", ""),
                            "source_url": page.get("url", ""),
                            "title": page.get("name", "")
                        }
                    )
                return results
        except Exception as e:
            # On failure we return a descriptive placeholder to maintain
            # the integrity of downstream processing.
            print(f"[ToolService] SIFT search error: {e}")
            return [
                {
                    "snippet": "Ошибка при выполнении поиска.",
                    "source_url": "error",
                    "title": "Ошибка"
                }
            ]