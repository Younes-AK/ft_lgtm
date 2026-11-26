
import asyncio
import logging

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from wasi_python import run_async

app = FastAPI(title="Python Execution Worker")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CodeRequest(BaseModel):
    code: str = Field(min_length=1, max_length=50_000)


@app.post("/py_execute")
async def execute_code(request: CodeRequest):

    try:
        # Execute submitted code inside the WASM sandbox.
        async with asyncio.timeout(15):
            result = await run_async(
                ["-c", request.code],
                deadline_s=10,
                memory_bytes=256 * 1024 * 1024,
                output_bytes=1_000_000,
                fuel=500_000_000,
            )

        return {
            "success": result.exit_code == 0 and result.trapped is None,
            "exit_code": result.exit_code,
            "stdout": result.stdout.decode(errors="replace"),
            "stderr": result.stderr.decode(errors="replace"),
            "trapped": result.trapped,
            "fuel_used": result.fuel_used,
            "truncated": list(result.truncated),
        }

    except TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Execution timed out"
        )

    except Exception:
        logger.exception("Python execution failed")
        raise HTTPException(
            status_code=500,
            detail="Worker execution failed"
        )
