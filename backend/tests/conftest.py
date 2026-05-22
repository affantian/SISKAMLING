import os
import pytest
import requests

BASE_URL = os.environ.get(
    'EXPO_PUBLIC_BACKEND_URL',
    'https://f832a2e2-a9d2-47d1-9ac8-7c7726e6b8c7.preview.emergentagent.com'
).rstrip('/')


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def test_user_payload():
    # Use unique email so register is idempotent across runs
    import uuid
    return {
        "email": f"TEST_budi_{uuid.uuid4().hex[:8]}@test.com",
        "password": "password123",
        "nama": "TEST Budi Wijaya",
        "alamat": "Jl. Mawar No. 12",
        "rw": "07",
        "rt": "03",
        "language": "id",
    }


@pytest.fixture(scope="session")
def auth_token(api_client, base_url, test_user_payload):
    r = api_client.post(f"{base_url}/api/auth/register", json=test_user_payload)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    return data["access_token"]


@pytest.fixture(scope="session")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
