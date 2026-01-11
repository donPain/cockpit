import os
import subprocess
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory


APP_DIR = Path(__file__).resolve().parent

PROFILE_MAP = {
    "STG-BR": "Profile 5",
    "SANDRO-MASTER": "Default",
    "PROPOINT": "Profile 1",
    "LUDUS-SECURITY": "Profile 2",
    "STRIKE-CODED": "Profile 6",
    "STG-US": "Profile 4",
}


def find_chrome_exe() -> str | None:
    candidates = []
    program_files = os.environ.get("ProgramFiles")
    program_files_x86 = os.environ.get("ProgramFiles(x86)")

    if program_files:
        candidates.append(Path(program_files) / "Google" / "Chrome" / "Application" / "chrome.exe")
    if program_files_x86:
        candidates.append(Path(program_files_x86) / "Google" / "Chrome" / "Application" / "chrome.exe")

    for p in candidates:
        if p.exists():
            return str(p)
    return None


def launch_chrome_profile(profile_directory: str, url: str) -> None:
    chrome = find_chrome_exe()
    if not chrome:
        raise FileNotFoundError("chrome.exe não encontrado em Program Files")

    args = [
        chrome,
        f"--profile-directory={profile_directory}",
        "--new-window",
        url,
    ]

    # Evita travar o servidor e evita herdar console.
    creationflags = 0
    if os.name == "nt":
        creationflags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0) | getattr(subprocess, "DETACHED_PROCESS", 0)

    subprocess.Popen(
        args,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        stdin=subprocess.DEVNULL,
        creationflags=creationflags,
        cwd=str(APP_DIR),
    )


app = Flask(__name__, static_folder=None)


@app.get("/")
def index():
    return send_from_directory(APP_DIR, "cockpit.html")


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/api/profiles")
def profiles():
    return jsonify({"profiles": PROFILE_MAP})


@app.post("/api/open-profile/<name>")
def open_profile(name: str):
    profile = PROFILE_MAP.get(name)
    if not profile:
        return jsonify({"ok": False, "error": "Perfil desconhecido"}), 404

    payload = request.get_json(silent=True) or {}
    url = str(payload.get("url") or "chrome://newtab/")

    try:
        launch_chrome_profile(profile, url)
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8766, debug=False)
