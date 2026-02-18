export const initPy = `from pathlib import Path
import os
import sys
import subprocess

def get_path() -> Path:
    parent = Path(__file__).parent
    return (parent / "bin" / "<%= it.binName %>").resolve()

def run() -> None:
    path = get_path()
    path.chmod(0o774)
    if sys.platform == "win32":
        sys.exit(subprocess.run([path, *sys.argv[1:]]).returncode)
    else:
        os.execv(path, [str(path), *sys.argv[1:]])
`

export const wheelMetadata = `Wheel-Version: 1.0
Generator: manual 0.0.0
Root-Is-Purelib: false
Tag: <%= it.tag %>`
