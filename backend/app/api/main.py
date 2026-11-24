

from fastapi import FastAPI, HTTPException, Query

from sandbox.runtime import WasmRuntime

app = FastAPI()

# Initialize runtime once
runtime = WasmRuntime()


@app.get("/calculate")
def calculate(
    a: int = Query(ge=-(2**31), le=2**31 - 1),
    b: int = Query(ge=-(2**31), le=2**31 - 1)
):

    try:

        result = runtime.execute(a, b)

        return {
            "a": a,
            "b": b,
            "result": result,
            "executed_by": "WebAssembly"
        }

    except Exception:
        # Log the full exception in a real application.
        raise HTTPException(
            status_code=422,
            detail="WebAssembly execution failed"
        )