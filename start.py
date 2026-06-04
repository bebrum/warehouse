#!/usr/bin/env python3
"""Local launcher for the warehouse dashboard.

It prepares backend and frontend dependencies when needed, applies migrations,
and starts Django plus Vite in two child processes.
"""
from __future__ import annotations

import hashlib
import os
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / 'backend'
FRONTEND = ROOT / 'frontend'
VENV = BACKEND / '.venv'
LOG_DIR = BACKEND / 'logs'


def run(cmd: list[str], cwd: Path, env: dict[str, str] | None = None) -> None:
    print(f"\n$ {' '.join(cmd)}", flush=True)
    subprocess.check_call(cmd, cwd=str(cwd), env=env)


def hash_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def python_bin() -> Path:
    if os.name == 'nt':
        return VENV / 'Scripts' / 'python.exe'
    return VENV / 'bin' / 'python'


def npm_cmd() -> str:
    return 'npm.cmd' if os.name == 'nt' else 'npm'


def ensure_tools() -> None:
    if not shutil.which('python') and not shutil.which('python3'):
        raise SystemExit('Python не найден. Установите Python 3.11+ и повторите запуск.')
    if not shutil.which(npm_cmd()):
        raise SystemExit('npm не найден. Установите Node.js LTS и повторите запуск.')


def ensure_backend() -> None:
    requirements = BACKEND / 'requirements.txt'
    marker = VENV / '.requirements.sha256'

    if not VENV.exists():
        python_exe = shutil.which('python3') or shutil.which('python') or sys.executable
        run([python_exe, '-m', 'venv', str(VENV)], ROOT)

    py = str(python_bin())
    current_hash = hash_file(requirements)
    previous_hash = marker.read_text().strip() if marker.exists() else ''
    if current_hash != previous_hash:
        run([py, '-m', 'pip', 'install', '--upgrade', 'pip'], BACKEND)
        run([py, '-m', 'pip', 'install', '-r', str(requirements)], BACKEND)
        marker.write_text(current_hash)

    LOG_DIR.mkdir(exist_ok=True)
    run([py, 'manage.py', 'migrate'], BACKEND)


def ensure_frontend() -> None:
    package_json = FRONTEND / 'package.json'
    marker = FRONTEND / 'node_modules' / '.package.sha256'
    node_modules = FRONTEND / 'node_modules'
    current_hash = hash_file(package_json)
    previous_hash = marker.read_text().strip() if marker.exists() else ''

    if not node_modules.exists() or current_hash != previous_hash:
        run([npm_cmd(), 'install'], FRONTEND)
        marker.parent.mkdir(exist_ok=True)
        marker.write_text(current_hash)


def start_processes() -> int:
    env = os.environ.copy()
    env.setdefault('PYTHONUNBUFFERED', '1')

    backend = subprocess.Popen(
        [str(python_bin()), 'manage.py', 'runserver', '127.0.0.1:8000'],
        cwd=str(BACKEND),
        env=env,
    )
    frontend = subprocess.Popen(
        [npm_cmd(), 'run', 'dev'],
        cwd=str(FRONTEND),
        env=env,
    )

    print('\nBackend:  http://127.0.0.1:8000/api/')
    print('Frontend: http://127.0.0.1:5173/')
    print('Логи backend: backend/logs/backend.log')
    print('Для остановки нажмите Ctrl+C.\n')

    processes = [backend, frontend]
    try:
      while True:
        for process in processes:
          code = process.poll()
          if code is not None:
            return code
        time.sleep(0.5)
    except KeyboardInterrupt:
      print('\nОстанавливаю процессы...')
      for process in processes:
        if process.poll() is None:
          if os.name == 'nt':
            process.terminate()
          else:
            process.send_signal(signal.SIGTERM)
      for process in processes:
        try:
          process.wait(timeout=8)
        except subprocess.TimeoutExpired:
          process.kill()
      return 0


def main() -> int:
    ensure_tools()
    ensure_backend()
    ensure_frontend()
    return start_processes()


if __name__ == '__main__':
    raise SystemExit(main())
