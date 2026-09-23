"""Backend regression tests for Arsa Wedding Gallery."""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://arsa-wedding-fix.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "dniel8188@gmail.com"
ADMIN_PASSWORD = "Dniel2006"
DEMO_SLUG = "arsa-demo"


# ------- fixtures -------
@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def demo_gallery():
    r = requests.get(f"{API}/public/galleries/{DEMO_SLUG}", timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


# ------- auth -------
class TestAuth:
    def test_login_success(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 20
        assert data["user"]["email"] == ADMIN_EMAIL

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_me_requires_token(self):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 401

    def test_me_returns_user(self, auth_headers):
        r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL


# ------- public gallery + serve/download -------
class TestPublicAndDownload:
    def test_public_gallery(self, demo_gallery):
        assert demo_gallery["slug"] == DEMO_SLUG
        assert len(demo_gallery["photos"]) == 9
        p0 = demo_gallery["photos"][0]
        for f in ("file_url", "download_url", "download_name", "id"):
            assert f in p0
        assert p0["download_name"].startswith(f"{DEMO_SLUG}-001")

    def test_serve_photo_inline(self, demo_gallery):
        pid = demo_gallery["photos"][0]["id"]
        r = requests.get(f"{API}/photos/{pid}/file", timeout=60)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")
        assert len(r.content) > 1000

    def test_download_has_attachment_header(self, demo_gallery):
        p = demo_gallery["photos"][0]
        r = requests.get(f"{API}/photos/{p['id']}/download", timeout=60)
        assert r.status_code == 200
        cd = r.headers.get("Content-Disposition", "")
        assert "attachment" in cd.lower()
        assert p["download_name"] in cd
        # Content-Length matches body
        cl = int(r.headers.get("Content-Length", "0"))
        assert cl == len(r.content) > 1000
        assert r.headers.get("content-type", "").startswith("image/")

    def test_download_nonexistent(self):
        r = requests.get(f"{API}/photos/does-not-exist/download", timeout=30)
        assert r.status_code == 404


# ------- admin protection -------
class TestAdminProtection:
    def test_list_galleries_requires_auth(self):
        assert requests.get(f"{API}/galleries", timeout=30).status_code == 401

    def test_create_gallery_requires_auth(self):
        assert requests.post(f"{API}/galleries", json={"title": "x"}, timeout=30).status_code == 401

    def test_upload_requires_auth(self, demo_gallery):
        r = requests.post(f"{API}/galleries/{demo_gallery['id']}/photos",
                          files={"files": ("a.jpg", b"x", "image/jpeg")}, timeout=30)
        assert r.status_code == 401

    def test_reorder_requires_auth(self, demo_gallery):
        r = requests.put(f"{API}/galleries/{demo_gallery['id']}/photos/reorder",
                         json={"photo_ids": []}, timeout=30)
        assert r.status_code == 401


# ------- gallery CRUD + photo lifecycle + isolation + toggle -------
class TestGalleryCRUD:
    created_id = None

    def test_full_lifecycle(self, auth_headers, demo_gallery):
        # CREATE
        r = requests.post(f"{API}/galleries", headers=auth_headers,
                          json={"title": "TEST Throwaway Gallery"}, timeout=30)
        assert r.status_code == 200, r.text
        g = r.json()
        gid = g["id"]
        assert g["slug"].startswith("test-throwaway-gallery")
        TestGalleryCRUD.created_id = gid

        # GET by id
        r = requests.get(f"{API}/galleries/id/{gid}", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert r.json()["title"] == "TEST Throwaway Gallery"

        # UPDATE branding
        r = requests.put(f"{API}/galleries/{gid}", headers=auth_headers,
                         json={"title": "TEST Updated", "primary_color": "#123456", "layout": "masonry"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["title"] == "TEST Updated"
        assert r.json()["primary_color"] == "#123456"

        # UPLOAD photo (tiny 1x1 png)
        png = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90"
               b"wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x00\x03\x00\x01\\\xcd\xff\x69\x00\x00\x00\x00IEND\xaeB`\x82")
        r = requests.post(f"{API}/galleries/{gid}/photos", headers=auth_headers,
                          files=[("files", ("test.png", png, "image/png"))], timeout=120)
        assert r.status_code == 200, r.text
        photos = r.json()
        assert len(photos) == 1
        pid = photos[0]["id"]
        assert photos[0]["download_name"].endswith(".png")

        # serve file
        r = requests.get(f"{API}/photos/{pid}/file", timeout=60)
        assert r.status_code == 200
        assert r.content == png or len(r.content) > 0

        # download with attachment header
        r = requests.get(f"{API}/photos/{pid}/download", timeout=60)
        assert r.status_code == 200
        assert "attachment" in r.headers.get("Content-Disposition", "").lower()
        # slug in filename => client isolation
        r_get = requests.get(f"{API}/galleries/id/{gid}", headers=auth_headers, timeout=30).json()
        assert r_get["slug"] in r.headers["Content-Disposition"]

        # DOWNLOAD TOGGLE off => 403
        r = requests.put(f"{API}/galleries/{gid}", headers=auth_headers,
                         json={"download_enabled": False}, timeout=30)
        assert r.status_code == 200
        r = requests.get(f"{API}/photos/{pid}/download", timeout=30)
        assert r.status_code == 403

        # RE-ENABLE => 200
        r = requests.put(f"{API}/galleries/{gid}", headers=auth_headers,
                         json={"download_enabled": True}, timeout=30)
        assert r.status_code == 200
        r = requests.get(f"{API}/photos/{pid}/download", timeout=60)
        assert r.status_code == 200

        # REORDER (single item)
        r = requests.put(f"{API}/galleries/{gid}/photos/reorder", headers=auth_headers,
                         json={"photo_ids": [pid]}, timeout=30)
        assert r.status_code == 200

        # DELETE photo -> disappears + file 404
        r = requests.delete(f"{API}/photos/{pid}", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        r = requests.get(f"{API}/galleries/id/{gid}", headers=auth_headers, timeout=30)
        assert all(p["id"] != pid for p in r.json()["photos"])
        assert requests.get(f"{API}/photos/{pid}/file", timeout=30).status_code == 404
        assert requests.get(f"{API}/photos/{pid}/download", timeout=30).status_code == 404

        # DELETE gallery
        r = requests.delete(f"{API}/galleries/{gid}", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        r = requests.get(f"{API}/galleries/id/{gid}", headers=auth_headers, timeout=30)
        assert r.status_code == 404

    def test_slug_uniqueness(self, auth_headers):
        # create two with same title -> different slugs
        r1 = requests.post(f"{API}/galleries", headers=auth_headers, json={"title": "TEST Same Title"}, timeout=30)
        r2 = requests.post(f"{API}/galleries", headers=auth_headers, json={"title": "TEST Same Title"}, timeout=30)
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["slug"] != r2.json()["slug"]
        # cleanup
        for j in (r1, r2):
            requests.delete(f"{API}/galleries/{j.json()['id']}", headers=auth_headers, timeout=30)
