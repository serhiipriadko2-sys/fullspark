import os
import pytest
import asyncio
import httpx
from asgi_lifespan import LifespanManager

from main import app, get_session, persistence


@pytest.fixture(scope="session")
def event_loop():
    """Create an asyncio event loop for pytest-asyncio."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
def test_db(tmp_path_factory):
    """
    Use a temporary database for the duration of the tests. This fixture
    overrides the ISKRA_DB_PATH environment variable and reinitialises
    persistence to point at the test database. After tests complete the
    database file is removed.
    """
    test_db_path = tmp_path_factory.mktemp("iskra_test") / "iskra_archive_test.db"
    os.environ["ISKRA_DB_PATH"] = str(test_db_path)
    # Reinitialise persistence service with the new path
    persistence.__init__(db_path=str(test_db_path))
    yield
    # Cleanup test database file
    if os.path.exists(test_db_path):
        os.remove(test_db_path)


@pytest.fixture(scope="session")
async def test_client():
    """
    Create an AsyncClient that uses the FastAPI app for tests.
    The LifespanManager ensures startup and shutdown events are properly handled.
    """
    async with LifespanManager(app):
        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            yield client