import os
import pytest
import asyncio
import httpx
from asgi_lifespan import LifespanManager

from main import app, get_session, persistence


@pytest.fixture(scope="function", autouse=True)
def reset_dynamic_thresholds():
    """Reset dynamic thresholds to base values before each test."""
    try:
        from services.dynamic_thresholds import dynamic_thresholds
        # Reset to base thresholds
        dynamic_thresholds._dynamic = dynamic_thresholds._base.copy()
        dynamic_thresholds._pain_history._history.clear()
        dynamic_thresholds._drift_history.clear()
        dynamic_thresholds._clarity_history.clear()
    except Exception:
        pass  # dynamic_thresholds not available
    yield


@pytest.fixture(scope="function", autouse=True)
def test_db(tmp_path):
    """
    Use a temporary database for the duration of each test. This fixture
    overrides the ISKRA_DB_PATH environment variable and reinitialises
    persistence to point at the test database. After tests complete the
    database file is removed.
    """
    test_db_path = tmp_path / "iskra_archive_test.db"
    os.environ["ISKRA_DB_PATH"] = str(test_db_path)
    # Reinitialise persistence service with the new path
    persistence.__init__(db_path=str(test_db_path))
    yield
    # Cleanup test database file
    if os.path.exists(test_db_path):
        os.remove(test_db_path)


@pytest.fixture(scope="function")
async def test_client():
    """
    Create an AsyncClient that uses the FastAPI app for tests.
    The LifespanManager ensures startup and shutdown events are properly handled.
    """
    async with LifespanManager(app):
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            yield client