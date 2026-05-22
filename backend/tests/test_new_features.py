"""Backend API tests for NEW Siskamling features:
- Role-based chat rooms (warga=1, koord_rw=2, koord_kel=3)
- Chat messages send/get with 403 enforcement
- /api/users/members listing
- /api/bencana/earthquakes (BMKG), /status, /reports
- Emergency alert with live location
- New register fields (kelurahan, role)
"""
import uuid
import pytest


# Module-scoped: 3 users with different roles in same kelurahan/rw
@pytest.fixture(scope="module")
def three_role_users(api_client, base_url):
    suffix = uuid.uuid4().hex[:8]
    users = {}
    for role in ["warga", "koordinator_rw", "koordinator_kelurahan"]:
        payload = {
            "email": f"TEST_{role}_{suffix}@test.com",
            "password": "password123",
            "nama": f"TEST {role}",
            "alamat": "Jl. Test 1",
            "kelurahan": "Sukamaju",
            "rw": "07",
            "rt": "03",
            "role": role,
            "language": "id",
        }
        r = api_client.post(f"{base_url}/api/auth/register", json=payload)
        assert r.status_code == 200, f"register {role} failed: {r.text}"
        body = r.json()
        users[role] = {
            "token": body["access_token"],
            "user": body["user"],
            "headers": {"Authorization": f"Bearer {body['access_token']}",
                        "Content-Type": "application/json"},
        }
    return users


# ==================== Register with new fields ====================
class TestRegisterNewFields:
    def test_register_with_kelurahan_and_role(self, three_role_users):
        for role, u in three_role_users.items():
            assert u["user"]["role"] == role
            assert u["user"]["kelurahan"] == "Sukamaju"
            assert u["user"]["rw"] == "07"


# ==================== Members ====================
class TestMembers:
    def test_members_lists_users_in_same_rw(self, api_client, base_url, three_role_users):
        warga = three_role_users["warga"]
        r = api_client.get(f"{base_url}/api/users/members", headers=warga["headers"])
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        # Should contain at least the 3 users we created
        emails_or_names = [m["nama"] for m in data]
        assert any("warga" in n for n in emails_or_names)
        assert any("koordinator_rw" in n for n in emails_or_names)
        # is_me flag must be set for current user
        me_entries = [m for m in data if m["is_me"]]
        assert len(me_entries) == 1
        assert me_entries[0]["nama"] == warga["user"]["nama"]
        # No mongodb _id leaked
        for m in data:
            assert "_id" not in m
            assert "id" in m and "role" in m and "rt" in m

    def test_members_requires_auth(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/users/members")
        assert r.status_code in (401, 403)


# ==================== Chat rooms role-based ====================
class TestChatRooms:
    def test_warga_sees_1_room(self, api_client, base_url, three_role_users):
        r = api_client.get(f"{base_url}/api/chat/rooms",
                           headers=three_role_users["warga"]["headers"])
        assert r.status_code == 200, r.text
        rooms = r.json()
        assert len(rooms) == 1
        assert rooms[0]["level"] == "rw"
        assert "07" in rooms[0]["id"]

    def test_koord_rw_sees_2_rooms(self, api_client, base_url, three_role_users):
        r = api_client.get(f"{base_url}/api/chat/rooms",
                           headers=three_role_users["koordinator_rw"]["headers"])
        assert r.status_code == 200, r.text
        rooms = r.json()
        assert len(rooms) == 2
        levels = sorted([rm["level"] for rm in rooms])
        assert levels == ["koord_rw", "rw"]

    def test_koord_kel_sees_3_rooms(self, api_client, base_url, three_role_users):
        r = api_client.get(f"{base_url}/api/chat/rooms",
                           headers=three_role_users["koordinator_kelurahan"]["headers"])
        assert r.status_code == 200, r.text
        rooms = r.json()
        assert len(rooms) == 3
        levels = sorted([rm["level"] for rm in rooms])
        assert levels == ["koord_kel", "koord_rw", "rw"]


# ==================== Chat messages ====================
class TestChatMessages:
    def test_send_and_get_message_in_rw_room(self, api_client, base_url, three_role_users):
        warga = three_role_users["warga"]
        # Get rooms
        rooms = api_client.get(f"{base_url}/api/chat/rooms",
                               headers=warga["headers"]).json()
        room_id = rooms[0]["id"]
        # Send a message
        text = f"TEST message {uuid.uuid4().hex[:6]}"
        send = api_client.post(f"{base_url}/api/chat/messages",
                               headers=warga["headers"],
                               json={"room_id": room_id, "text": text})
        assert send.status_code == 200, send.text
        sent = send.json()
        assert sent["text"] == text
        assert sent["is_me"] is True
        assert sent["user_role"] == "warga"
        # Retrieve messages
        msgs = api_client.get(f"{base_url}/api/chat/messages/{room_id}",
                              headers=warga["headers"])
        assert msgs.status_code == 200
        body = msgs.json()
        assert isinstance(body, list)
        assert any(m["text"] == text for m in body)
        for m in body:
            assert "_id" not in m
            assert "user_nama" in m and "user_role" in m

    def test_warga_blocked_from_koord_room_403(self, api_client, base_url, three_role_users):
        warga = three_role_users["warga"]
        # warga tries koord room id
        koord_room_id = "koord_rw_Sukamaju"
        r = api_client.get(f"{base_url}/api/chat/messages/{koord_room_id}",
                           headers=warga["headers"])
        assert r.status_code == 403, r.text

    def test_warga_post_to_koord_room_403(self, api_client, base_url, three_role_users):
        warga = three_role_users["warga"]
        r = api_client.post(f"{base_url}/api/chat/messages",
                            headers=warga["headers"],
                            json={"room_id": "koord_kel_Sukamaju", "text": "nope"})
        assert r.status_code == 403

    def test_chat_requires_auth(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/chat/rooms")
        assert r.status_code in (401, 403)


# ==================== Bencana ====================
class TestBencana:
    def test_earthquakes_returns_latest_object(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/bencana/earthquakes")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "latest" in data
        assert "recent_felt" in data
        # latest may be None if BMKG down -- but with fallback should be set
        if data["latest"]:
            for k in ["Magnitude", "Wilayah"]:
                assert k in data["latest"], f"missing key {k} in latest"

    def test_status_returns_6_disaster_types(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/bencana/status")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 6
        types = {d["type"] for d in data}
        assert {"gempa", "tsunami", "gunung", "longsor", "banjir", "angin"} == types
        valid_statuses = {"aman", "waspada", "siaga", "darurat"}
        for d in data:
            assert d["status"] in valid_statuses
            assert "name" in d and "icon" in d

    def test_create_and_get_disaster_reports(self, api_client, base_url, three_role_users):
        warga = three_role_users["warga"]
        payload = {
            "type": "banjir",
            "description": f"TEST banjir {uuid.uuid4().hex[:6]}",
            "location": {"lat": -6.9, "lng": 107.6},
            "alamat": "Jl. Test Banjir 1",
        }
        cr = api_client.post(f"{base_url}/api/bencana/reports",
                             headers=warga["headers"], json=payload)
        assert cr.status_code == 200, cr.text
        created_id = cr.json()["id"]
        # Get list
        gr = api_client.get(f"{base_url}/api/bencana/reports",
                            headers=warga["headers"])
        assert gr.status_code == 200
        reports = gr.json()
        assert any(r["id"] == created_id for r in reports)
        target = next(r for r in reports if r["id"] == created_id)
        assert target["type"] == "banjir"
        assert target["location"]["lat"] == -6.9
        assert "_id" not in target

    def test_reports_requires_auth(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/bencana/reports")
        assert r.status_code in (401, 403)


# ==================== Emergency alert with live location ====================
class TestEmergencyLiveLocation:
    def test_emergency_response_includes_location(self, api_client, base_url, three_role_users):
        warga = three_role_users["warga"]
        location = {"lat": -6.91234, "lng": 107.61234, "accuracy": 12.5}
        payload = {
            "type": "sos",
            "location": location,
            "alamat": "Live location test",
            "rw": "07",
            "rt": "03",
            "mode": "rumah",
            "description": "live gps test",
        }
        r = api_client.post(f"{base_url}/api/emergency/alert",
                            headers=warga["headers"], json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "location" in body
        assert body["location"]["lat"] == location["lat"]
        assert body["location"]["lng"] == location["lng"]
        assert "routing_info" in body
        # Verify it's in active list with location
        active = api_client.get(f"{base_url}/api/emergency/active",
                                headers=warga["headers"]).json()
        match = [a for a in active if a["id"] == body["id"]]
        assert len(match) == 1
        assert match[0]["location"]["lat"] == location["lat"]
