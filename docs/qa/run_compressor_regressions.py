"""Offline QA: compile production compressor with plain-data types; no event capture/injection."""
from pathlib import Path
import json
import subprocess
import tempfile
import sys

app = Path(__file__).resolve().parents[2]
source = (app / "src-tauri/src/types.rs").read_text()
source = source.replace("use serde::{Deserialize, Serialize};", "").replace(", Serialize, Deserialize", "")
source = "\n".join(line for line in source.splitlines() if not line.strip().startswith("#[serde"))
with tempfile.TemporaryDirectory(prefix="vxclick_qa_") as directory:
    target = Path(directory)
    (target / "types.rs").write_text(source)
    compressor = json.dumps(str(app / "src-tauri/src/compressor.rs"))
    harness = '#[path="types.rs"] mod types;\n' + f'#[path={compressor}] mod compressor;\n'
    harness += Path(__file__).with_name("compressor_regressions.rs").read_text()
    (target / "regression.rs").write_text(harness)
    build = subprocess.run(["rustc", "--edition=2021", "--test", str(target / "regression.rs"), "-o", str(target / "regression")], capture_output=True, text=True)
    if build.returncode:
        print(build.stderr)
        sys.exit(build.returncode)
    sys.exit(subprocess.run([str(target / "regression")]).returncode)
