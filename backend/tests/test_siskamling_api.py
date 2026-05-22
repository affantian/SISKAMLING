"""Backend API tests for Siskamling app.
Covers: auth (register/login/me), emergency (alert/history/active), weather (current/forecast/recommendations), user profile update.
"""
import pytest


# ==================== Auth ====================
class TestAuth:
    def test_register_creates_user_and_returns_token(self, api_client, base_url, test_user_payload, auth_token):
        # token already obtained via fixture (proves register worked)
        assert isinstance(auth_token, str) and len(auth_token) > 20

    def test_register_duplicate_email_returns_400(self, api_client, base_url, test_user_payload, auth_token):
        # Register with same email again
        r = api_client.post(f"{base_url}/api/auth/register", json=test_user_payload)
        assert r.status_code == 400
        assert "already" in r.json().get("detail", "").lower()

    def test_login_success(self, api_client, base_url, test_user_payload):
        r = api_client.post(f"{base_url}/api/auth/login", json={
            "email": test_user_payload["email"],
            "password": test_user_payload["password"],
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert "access_token" in body
        assert body["user"]["email"] == test_user_payload["email"]
        assert body["user"]["nama"] == test_user_payload["nama"]
        assert body["user"]["rw"] == test_user_payload["rw"]
        assert body["user"]["mode"] == "rumah"
        assert body["user"]["role"] == "warga"

    def test_login_invalid_password_returns_401(self, api_client, base_url, test_user_payload):
        r = api_client.post(f"{base_url}/api/auth/login", json={
            "email": test_user_payload["email"],
            "password": "wrongpassword",
        })
        assert r.status_code == 401

    def test_login_nonexistent_user_returns_401(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "TEST_doesnotexist_xyz@test.com",
            "password": "whatever",
        })
        assert r.status_code == 401

    def test_get_me_returns_current_user(self, api_client, base_url, auth_headers, test_user_payload):
        r = api_client.get(f"{base_url}/api/auth/me", headers=auth_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["email"] == test_user_payload["email"]
        assert body["nama"] == test_user_payload["nama"]
        assert body["language"] == "id"
        assert "id" in body and isinstance(body["id"], str)
        # Ensure MongoDB ObjectId is not leaked
        assert "_id" not in body

    def test_me_without_token_returns_401_or_403(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/auth/me")
        assert r.status_code in (401, 403)


# ==================== Emergency ====================
class TestEmergency:
    def test_create_emergency_sos_alert_and_persist(self, api_client, base_url, auth_headers):
        payload = {
            "type": "sos",
            "location": {"lat": -6.9, "lng": 107.6},
            "alamat": "Jl. Mawar No. 12",
            "rw": "07",
            "rt": "03",
            "mode": "rumah",
            "description": "Test SOS alert",
        }
        r = api_client.post(f"{base_url}/api/emergency/alert", headers=auth_headers, json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "id" in body and isinstance(body["id"], str)
        assert "routing_info" in body and isinstance(body["routing_info"], list)
        assert len(body["routing_info"]) == 4  # rumah mode -> 4 entries
        assert any("RW 07" in s for s in body["routing_info"])

        # Verify persistence via history
        h = api_client.get(f"{base_url}/api/emergency/history", headers=auth_headers)
        assert h.status_code == 200
        hist = h.json()
        assert isinstance(hist, list) and len(hist) >= 1
        ids = [a["id"] for a in hist]
        assert body["id"] in ids
        first = next(a for a in hist if a["id"] == body["id"])
        assert first["type"] == "sos"
        assert first["status"] == "active"
        assert "_id" not in first

    @pytest.mark.parametrize("alert_type", ["medis", "kriminal", "kebakaran"])
    def test_create_emergency_other_types(self, api_client, base_url, auth_headers, alert_type):
        payload = {
            "type": alert_type,
            "location": {"lat": -6.9, "lng": 107.6},
            "alamat": "Jl. Mawar No. 12",
            "rw": "07",
            "rt": "03",
            "mode": "pergi",
        }
        r = api_client.post(f"{base_url}/api/emergency/alert", headers=auth_headers, json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        # New contract: always 4 routing entries (warga + koord_rw + koord_kel + GPS LIVE)
        assert len(body["routing_info"]) == 4
        assert any("GPS LIVE" in s for s in body["routing_info"])

    def test_get_active_alerts(self, api_client, base_url, auth_headers):
        r = api_client.get(f"{base_url}/api/emergency/active", headers=auth_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for a in data:
            assert "_id" not in a
            assert "user_nama" in a and "type" in a

    def test_emergency_alert_requires_auth(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/emergency/alert", json={
            "type": "sos", "location": {"lat": 0, "lng": 0},
            "alamat": "x", "rw": "1", "rt": "1", "mode": "rumah"
        })
        assert r.status_code in (401, 403)


# ==================== Weather (mock) ====================
class TestWeather:
    def test_current_weather(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/weather/current")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["temp", "humidity", "wind_speed", "uv_index", "aqi", "rain_chance", "condition", "location"]:
            assert k in d, f"missing key {k}"
        assert isinstance(d["temp"], (int, float))
        assert isinstance(d["uv_index"], (int, float))

    def test_forecast(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/weather/forecast")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) == 5
        for item in data:
            assert "day" in item and "temp" in item and "icon" in item

    def test_recommendations(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/weather/recommendations")
        assert r.status_code == 200
        d = r.json()
        for k in ["sunscreen", "payung", "masker"]:
            assert k in d
            assert "needed" in d[k]
            assert "level" in d[k]
            assert isinstance(d[k]["needed"], bool)
        # uv_index=7 in mock -> sunscreen needed
        assert d["sunscreen"]["needed"] is True
        # rain_chance=20 -> payung not needed
        assert d["payung"]["needed"] is False
        # aqi=87 -> masker not needed (>=100 in code)
        assert d["masker"]["needed"] is False


# ==================== User profile ====================
class TestUserProfile:
    def test_update_language_and_mode(self, api_client, base_url, auth_headers):
        r = api_client.put(f"{base_url}/api/users/profile", headers=auth_headers, json={
            "language": "en",
            "mode": "pergi",
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["language"] == "en"
        assert body["mode"] == "pergi"
        assert "_id" not in body

        # Verify via /auth/me
        m = api_client.get(f"{base_url}/api/auth/me", headers=auth_headers)
        assert m.status_code == 200
        mb = m.json()
        assert mb["language"] == "en"
        assert mb["mode"] == "pergi"

    def test_profile_update_requires_auth(self, api_client, base_url):
        r = api_client.put(f"{base_url}/api/users/profile", json={"language": "en"})
        assert r.status_code in (401, 403)
