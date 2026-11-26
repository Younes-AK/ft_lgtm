import subprocess
import tempfile

from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="Rust Execution Worker")


class CodeRequest(BaseModel):
    code: str = Field(min_length=1, max_length=50_000)


@app.post("/rust_execute")
def execute_code(request: CodeRequest):

    with tempfile.TemporaryDirectory() as tmp:
        directory = Path(tmp)

        source = directory / "main.rs"
        binary = directory / "program"

        source.write_text(request.code)

        try:
            # Compile Rust code
            compilation = subprocess.run(
                ["rustc", str(source), "-o", str(binary)],
                capture_output=True,
                text=True,
                timeout=15,
                cwd=directory
            )

            if compilation.returncode != 0:
                return {
                    "success": False,
                    "stage": "compilation",
                    "stdout": compilation.stdout,
                    "stderr": compilation.stderr,
                    "exit_code": compilation.returncode
                }

            # Execute compiled program
            execution = subprocess.run(
                [str(binary)],
                capture_output=True,
                text=True,
                timeout=5,
                cwd=directory
            )

            return {
                "success": execution.returncode == 0,
                "stage": "execution",
                "stdout": execution.stdout,
                "stderr": execution.stderr,
                "exit_code": execution.returncode
            }

        except subprocess.TimeoutExpired:
            raise HTTPException(
                status_code=504,
                detail="Execution timed out"
            )