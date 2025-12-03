"""
Integration tests for the /ask API endpoint.

This test ensures that the main API pipeline executes without errors when
mocked services are in place. It verifies that the session persistence
works across requests and that the Phoenix ritual resets the state.
"""

import json
import pytest
import httpx

from core.models import IskraMetrics, IskraResponse, AdomlBlock, FacetType, PhaseType

# pytest-asyncio marker: all tests in this module are asynchronous.
pytestmark = pytest.mark.asyncio


async def test_ask_endpoint_basic_flow(test_client: httpx.AsyncClient, mocker) -> None:
    """
    Test the /ask endpoint with a simple flow: first request triggers the
    mantra (init), second request returns a mocked response from the agent.
    """
    user_id = "api-flow-test"

    # Mock the special response for the mantra (first launch)
    from services.llm import LLMService
    mantra_resp = IskraResponse(
        facet=FacetType.ISKRA,
        content="Мантра",
        adoml=AdomlBlock(
            delta="Мантра активирована.",
            sift="N/A",
            omega=0.9,
            lambda_latch="{action: \"Продолжить диалог\", owner: \"User\", condition: \"N/A\", <=24h: true}"
        ),
        metrics_snapshot=IskraMetrics(),
        i_loop="voice=⟡; phase=INIT; intent=declare_mantra",
        a_index=1.0
    )
    mocker.patch(
        'services.llm.LLMService._generate_special_response',
        return_value=mantra_resp
    )

    # First call: should trigger mantra
    response = await test_client.post(
        "/ask",
        json={"user_id": user_id, "query": "Привет"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "Мантра"

    # Now mock the main response pipeline to return a predictable answer
    normal_resp = IskraResponse(
        facet=FacetType.ISKRA,
        content="Ответ",
        adoml=AdomlBlock(
            delta="Ответ создан.",
            sift="SIFT: [mock]",
            omega=0.8,
            lambda_latch="{action: \"Завершить\", owner: \"User\", condition: \"N/A\", <=24h: true}"
        ),
        metrics_snapshot=IskraMetrics(),
        i_loop="voice=⟡; phase=TESTING; intent=reply",
        a_index=0.5
    )
    mocker.patch(
        'services.llm.LLMService.generate_response',
        return_value=normal_resp
    )
    # Second call: should return our mocked normal response
    response2 = await test_client.post(
        "/ask",
        json={"user_id": user_id, "query": "Как дела?"}
    )
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["content"] == "Ответ"

async def test_phoenix_resets_state(test_client: httpx.AsyncClient, mocker) -> None:
    """
    Ensure that the Phoenix ritual resets the user's session.
    """
    user_id = "phoenix-state"
    # Mock LLM for mantra
    from services.llm import LLMService
    mantra_resp = IskraResponse(
        facet=FacetType.ISKRA,
        content="Мантра",
        adoml=AdomlBlock(
            delta="Мантра активирована.",
            sift="N/A",
            omega=0.9,
            lambda_latch="{action: \"Продолжить диалог\", owner: \"User\", condition: \"N/A\", <=24h: true}"
        ),
        metrics_snapshot=IskraMetrics(),
        i_loop="voice=⟡; phase=INIT; intent=declare_mantra",
        a_index=1.0
    )
    mocker.patch(
        'services.llm.LLMService._generate_special_response',
        return_value=mantra_resp
    )
    # Initial call to create session
    await test_client.post(
        "/ask",
        json={"user_id": user_id, "query": "Привет"}
    )
    # Phoenix ritual
    phoenix_resp = await test_client.post(f"/ritual/phoenix/{user_id}")
    assert phoenix_resp.status_code == 200
    # Call again: should treat as first launch again (mantra)
    response_again = await test_client.post(
        "/ask",
        json={"user_id": user_id, "query": "Снова?"}
    )
    assert response_again.status_code == 200
    assert response_again.json()["content"] == "Мантра"