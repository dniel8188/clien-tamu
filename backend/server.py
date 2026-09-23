from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Form
from fastapi.responses import StreamingResponse, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
import io
import re
import asyncio
import requests
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta

# ------------------------------------------------------------------ config
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
APP_NAME = "arsa-wedding"

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "heic": "image/heic",
}

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ------------------------------------------------------------------ object storage
storage_key = None


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ------------------------------------------------------------------ auth helpers
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_admin(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("password_hash", None)
        user.pop("_id", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ------------------------------------------------------------------ models
DEFAULT_THEME = {
    "primary_color": "#D4AF37",
    "font": "Cormorant Garamond",
    "logo_url": "",
    "layout": "grid",
    "download_enabled": True,
    "background": "#3B0D17",
}


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class GalleryCreate(BaseModel):
    title: str
    slug: Optional[str] = None
    description: str = ""
    event_date: str = ""
    logo_url: str = ""
    primary_color: str = "#D4AF37"
    background: str = "#3B0D17"
    font: str = "Cormorant Garamond"
    layout: str = "grid"
    download_enabled: bool = True


class GalleryUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    background: Optional[str] = None
    font: Optional[str] = None
    layout: Optional[str] = None
    download_enabled: Optional[bool] = None


class ReorderInput(BaseModel):
    photo_ids: List[str]


def slugify(text: str) -> str:
    text = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')
    return text or "gallery"


def clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


async def photo_public(p: dict, index: int, slug: str) -> dict:
    ext = (p.get("ext") or "jpg")
    return {
        "id": p["id"],
        "gallery_id": p["gallery_id"],
        "order": p["order"],
        "caption": p.get("caption", ""),
        "width": p.get("width"),
        "height": p.get("height"),
        "file_url": f"/api/photos/{p['id']}/file",
        "download_url": f"/api/photos/{p['id']}/download",
        "download_name": f"{slug}-{index:03d}.{ext}",
    }


# ------------------------------------------------------------------ auth routes
@api_router.post("/auth/login")
async def login(data: LoginInput):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    token = create_access_token(user["id"], user["email"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user.get("name", "Admin")}}


@api_router.get("/auth/me")
async def me(admin: dict = Depends(get_current_admin)):
    return {"id": admin["id"], "email": admin["email"], "name": admin.get("name", "Admin")}


# ------------------------------------------------------------------ gallery admin routes
@api_router.get("/galleries")
async def list_galleries(admin: dict = Depends(get_current_admin)):
    galleries = await db.galleries.find().sort("created_at", -1).to_list(1000)
    out = []
    for g in galleries:
        clean(g)
        g["photo_count"] = await db.photos.count_documents({"gallery_id": g["id"], "is_deleted": False})
        out.append(g)
    return out


@api_router.post("/galleries")
async def create_gallery(data: GalleryCreate, admin: dict = Depends(get_current_admin)):
    slug = slugify(data.slug or data.title)
    if await db.galleries.find_one({"slug": slug}):
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"
    doc = {
        "id": str(uuid.uuid4()),
        "slug": slug,
        "title": data.title,
        "description": data.description,
        "event_date": data.event_date,
        "logo_url": data.logo_url,
        "primary_color": data.primary_color,
        "background": data.background,
        "font": data.font,
        "layout": data.layout,
        "download_enabled": data.download_enabled,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.galleries.insert_one(doc)
    return clean(doc)


@api_router.get("/galleries/id/{gallery_id}")
async def get_gallery_admin(gallery_id: str, admin: dict = Depends(get_current_admin)):
    g = await db.galleries.find_one({"id": gallery_id})
    if not g:
        raise HTTPException(status_code=404, detail="Galeri tidak ditemukan")
    clean(g)
    photos = await db.photos.find({"gallery_id": gallery_id, "is_deleted": False}).sort("order", 1).to_list(1000)
    g["photos"] = [await photo_public(p, i + 1, g["slug"]) for i, p in enumerate(photos)]
    return g


@api_router.put("/galleries/{gallery_id}")
async def update_gallery(gallery_id: str, data: GalleryUpdate, admin: dict = Depends(get_current_admin)):
    g = await db.galleries.find_one({"id": gallery_id})
    if not g:
        raise HTTPException(status_code=404, detail="Galeri tidak ditemukan")
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if "slug" in updates:
        new_slug = slugify(updates["slug"])
        existing = await db.galleries.find_one({"slug": new_slug, "id": {"$ne": gallery_id}})
        updates["slug"] = f"{new_slug}-{uuid.uuid4().hex[:4]}" if existing else new_slug
    if updates:
        await db.galleries.update_one({"id": gallery_id}, {"$set": updates})
    g = await db.galleries.find_one({"id": gallery_id})
    return clean(g)


@api_router.delete("/galleries/{gallery_id}")
async def delete_gallery(gallery_id: str, admin: dict = Depends(get_current_admin)):
    await db.galleries.delete_one({"id": gallery_id})
    await db.photos.update_many({"gallery_id": gallery_id}, {"$set": {"is_deleted": True}})
    return {"ok": True}


# ------------------------------------------------------------------ photo admin routes
@api_router.post("/galleries/{gallery_id}/photos")
async def upload_photos(gallery_id: str, files: List[UploadFile] = File(...), admin: dict = Depends(get_current_admin)):
    g = await db.galleries.find_one({"id": gallery_id})
    if not g:
        raise HTTPException(status_code=404, detail="Galeri tidak ditemukan")
    last = await db.photos.find({"gallery_id": gallery_id, "is_deleted": False}).sort("order", -1).limit(1).to_list(1)
    order = (last[0]["order"] + 1) if last else 0
    created = []
    for f in files:
        ext = f.filename.split(".")[-1].lower() if "." in f.filename else "jpg"
        content_type = f.content_type or MIME_TYPES.get(ext, "image/jpeg")
        data = await f.read()
        pid = str(uuid.uuid4())
        path = f"{APP_NAME}/galleries/{gallery_id}/{pid}.{ext}"
        result = put_object(path, data, content_type)
        doc = {
            "id": pid,
            "gallery_id": gallery_id,
            "storage_path": result["path"],
            "source_url": None,
            "original_filename": f.filename,
            "content_type": content_type,
            "ext": ext,
            "size": result.get("size"),
            "caption": "",
            "order": order,
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.photos.insert_one(doc)
        created.append(await photo_public(doc, order + 1, g["slug"]))
        order += 1
    return created


@api_router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: str, admin: dict = Depends(get_current_admin)):
    await db.photos.update_one({"id": photo_id}, {"$set": {"is_deleted": True}})
    return {"ok": True}


@api_router.put("/galleries/{gallery_id}/photos/reorder")
async def reorder_photos(gallery_id: str, data: ReorderInput, admin: dict = Depends(get_current_admin)):
    for idx, pid in enumerate(data.photo_ids):
        await db.photos.update_one({"id": pid, "gallery_id": gallery_id}, {"$set": {"order": idx}})
    return {"ok": True}


# ------------------------------------------------------------------ public routes
@api_router.get("/public/galleries/{slug}")
async def public_gallery(slug: str):
    g = await db.galleries.find_one({"slug": slug})
    if not g:
        raise HTTPException(status_code=404, detail="Galeri tidak ditemukan")
    clean(g)
    photos = await db.photos.find({"gallery_id": g["id"], "is_deleted": False}).sort("order", 1).to_list(1000)
    g["photos"] = [await photo_public(p, i + 1, g["slug"]) for i, p in enumerate(photos)]
    return g


async def _fetch_photo_bytes(photo: dict) -> tuple[bytes, str]:
    if photo.get("storage_path"):
        return get_object(photo["storage_path"])
    if photo.get("source_url"):
        r = requests.get(photo["source_url"], timeout=60)
        r.raise_for_status()
        return r.content, r.headers.get("Content-Type", photo.get("content_type", "image/jpeg"))
    raise HTTPException(status_code=404, detail="File tidak ditemukan")


def _iter_bytes(data: bytes, chunk: int = 262144):
    stream = io.BytesIO(data)
    while True:
        block = stream.read(chunk)
        if not block:
            break
        yield block


@api_router.get("/photos/{photo_id}/file")
async def serve_photo(photo_id: str):
    photo = await db.photos.find_one({"id": photo_id, "is_deleted": False})
    if not photo:
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    data, content_type = await _fetch_photo_bytes(photo)
    return Response(content=data, media_type=content_type,
                    headers={"Cache-Control": "public, max-age=86400"})


@api_router.get("/photos/{photo_id}/download")
async def download_photo(photo_id: str):
    photo = await db.photos.find_one({"id": photo_id, "is_deleted": False})
    if not photo:
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    gallery = await db.galleries.find_one({"id": photo["gallery_id"]})
    if not gallery:
        raise HTTPException(status_code=404, detail="Galeri tidak ditemukan")
    if not gallery.get("download_enabled", True):
        raise HTTPException(status_code=403, detail="Download dinonaktifkan untuk galeri ini")
    # compute the ordered index for a clean filename
    siblings = await db.photos.find({"gallery_id": photo["gallery_id"], "is_deleted": False}).sort("order", 1).to_list(1000)
    index = next((i + 1 for i, p in enumerate(siblings) if p["id"] == photo_id), 1)
    ext = photo.get("ext", "jpg")
    filename = f"{gallery['slug']}-{index:03d}.{ext}"
    data, content_type = await _fetch_photo_bytes(photo)
    return StreamingResponse(
        _iter_bytes(data),
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(data)),
        },
    )


@api_router.get("/")
async def root():
    return {"message": "Arsa Wedding Gallery API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


# ------------------------------------------------------------------ seeding
SAMPLE_PHOTOS = [
    ("Bride & Groom Veil Portrait", "https://images.unsplash.com/photo-1606216794050-6ff7db8cb43d?crop=entropy&cs=srgb&fm=jpg&q=85"),
    ("Romantic Wedding Embrace", "https://images.unsplash.com/photo-1519741196428-6a2175fa2557?crop=entropy&cs=srgb&fm=jpg&q=85"),
    ("Golden Hour Couple Walk", "https://images.unsplash.com/photo-1721401870202-8e2264ecced2?crop=entropy&cs=srgb&fm=jpg&q=85"),
    ("Elegantly Dressed Bride & Groom", "https://images.pexels.com/photos/7777910/pexels-photo-7777910.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"),
    ("Diamond Wedding Rings on Roses", "https://images.unsplash.com/photo-1705058718118-80cadb3e9f4c?crop=entropy&cs=srgb&fm=jpg&q=85"),
    ("Silver Rings Close Up", "https://images.unsplash.com/photo-1562249004-1f7289c19c49?crop=entropy&cs=srgb&fm=jpg&q=85"),
    ("Rose & Bouquet Details", "https://images.unsplash.com/photo-1593472129865-f71f62103a47?crop=entropy&cs=srgb&fm=jpg&q=85"),
    ("Bride holding White Rose Bouquet", "https://images.pexels.com/photos/38740375/pexels-photo-38740375.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"),
    ("Champagne Toast Celebration", "https://images.pexels.com/photos/29152202/pexels-photo-29152202.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"),
]


async def seed_admin():
    email = os.environ["ADMIN_EMAIL"].lower()
    password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": email, "password_hash": hash_password(password),
            "name": "Admin", "role": "admin", "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin seeded")
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password)}})
        logger.info("Admin password updated")


async def seed_demo_gallery():
    theme = {"primary_color": "#D4AF37", "background": "#3B0D17",
             "font": "Cormorant Garamond", "layout": "grid"}
    existing = await db.galleries.find_one({"slug": "arsa-demo"})
    if existing:
        await db.galleries.update_one({"slug": "arsa-demo"}, {"$set": theme})
        return
    gid = str(uuid.uuid4())
    await db.galleries.insert_one({
        "id": gid, "slug": "arsa-demo", "title": "Dniel & Sarah",
        "description": "Sebuah perayaan cinta yang abadi. Terima kasih telah menjadi bagian dari hari istimewa kami.",
        "event_date": "12 Juni 2026", "logo_url": "",
        "primary_color": "#D4AF37", "background": "#3B0D17",
        "font": "Cormorant Garamond", "layout": "grid", "download_enabled": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    for i, (caption, url) in enumerate(SAMPLE_PHOTOS):
        await db.photos.insert_one({
            "id": str(uuid.uuid4()), "gallery_id": gid, "storage_path": None,
            "source_url": url, "original_filename": f"{caption}.jpg",
            "content_type": "image/jpeg", "ext": "jpg", "size": None,
            "caption": caption, "order": i, "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    logger.info("Demo gallery seeded")


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.galleries.create_index("slug", unique=True)
    await db.photos.create_index("gallery_id")
    await seed_admin()
    await seed_demo_gallery()
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
