
import os
import uuid
import httpx

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()

# Execution workers
PY_WORKER_URL = "http://python_worker:8001/py_execute"
RUST_WORKER_URL = "http://rust_worker:8001/rust_execute"

# IPFS Kubo
IPFS_API_URL = "http://ipfs:5001/api/v0"
IPFS_GATEWAY_URL = "http://ipfs:8080/ipfs"

# Public URL of your application
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:5173").rstrip("/")

# Temporary storage (replace with PostgreSQL)
shared_codes = {}


class CodeRequest(BaseModel):
    code: str = Field(min_length=1, max_length=50_000)
    language: str


class ShareRequest(BaseModel):
    code: str = Field(min_length=1, max_length=50_000)
    language: str
    title: str = Field(default="Untitled", max_length=100)


# -------------------------
# CODE EXECUTION
# -------------------------

@app.post("/run")
async def run_code(request: CodeRequest):

    if request.language == "python":
        worker_url = PY_WORKER_URL

    elif request.language == "rust":
        worker_url = RUST_WORKER_URL

    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported language"
        )

    try:
        async with httpx.AsyncClient(timeout=60) as client:

            response = await client.post(
                worker_url,
                json={"code": request.code}
            )

            response.raise_for_status()

            return response.json()

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Worker request timed out"
        )

    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="Worker returned an error"
        )

    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Worker is unavailable"
        )


# -------------------------
# SHARE CODE THROUGH IPFS
# -------------------------

@app.post("/share")
async def share_code(request: ShareRequest):

    if request.language not in ["python", "rust"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported language"
        )

    try:
        async with httpx.AsyncClient(timeout=30) as client:

            response = await client.post(
                f"{IPFS_API_URL}/add",
                files={
                    "file": (
                        "code.txt",
                        request.code.encode("utf-8"),
                        "text/plain"
                    )
                },
                params={"pin": "true"}
            )

            response.raise_for_status()

            ipfs_result = response.json()

            cid = ipfs_result["Hash"]

            # Generate application share ID
            share_id = str(uuid.uuid4())

            # Save metadata
            shared_codes[share_id] = {
                "cid": cid,
                "language": request.language,
                "title": request.title
            }

            return {
                "success": True,
                "share_id": share_id,
                "cid": cid,
                "share_url": f"{PUBLIC_BASE_URL}/share/{share_id}"
            }

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="IPFS upload timed out"
        )

    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="IPFS returned an error"
        )

    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="IPFS node is unavailable"
        )


# -------------------------
# RETRIEVE SHARED CODE
# -------------------------

@app.get("/share/{share_id}")
async def get_shared_code(share_id: str):

    share = shared_codes.get(share_id)

    if not share:
        raise HTTPException(
            status_code=404,
            detail="Shared code not found"
        )

    cid = share["cid"]

    try:
        async with httpx.AsyncClient(timeout=30) as client:

            response = await client.get(
                f"{IPFS_GATEWAY_URL}/{cid}"
            )

            response.raise_for_status()

            return {
                "success": True,
                "title": share["title"],
                "language": share["language"],
                "cid": cid,
                "code": response.text
            }

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="IPFS retrieval timed out"
        )

    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="Could not retrieve content from IPFS"
        )

    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="IPFS node is unavailable"
        )
