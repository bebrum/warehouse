# -*- coding: utf-8 -*-
"""
Apply Windows 7 compatibility adapter to https://github.com/bebrum/warehouse.

Run from the ROOT of a downloaded/cloned warehouse project:
    python apply_win7_patch.py

What it does:
- backs up files it is going to overwrite to .win7-backup/<timestamp>/
- pins backend to Python 3.8-compatible Django 4.2 stack
- pins frontend to stable React/Vite versions for prebuilding on a modern PC
- adds Windows 7 launch scripts that do NOT require Node.js on Windows 7
"""
from __future__ import print_function

import datetime as _dt
import json
import os
from pathlib import Path
import shutil
import textwrap

ROOT = Path.cwd()
BACKUP_ROOT = ROOT / ".win7-backup" / _dt.datetime.now().strftime("%Y%m%d-%H%M%S")


def fail(message):
    raise SystemExit("ERROR: " + message)


def require_project_root():
    required = [
        ROOT / "backend" / "manage.py",
        ROOT / "backend" / "requirements.txt",
        ROOT / "frontend" / "package.json",
        ROOT / "frontend" / "src",
    ]
    missing = [str(p.relative_to(ROOT)) for p in required if not p.exists()]
    if missing:
        fail(
            "run this script from the warehouse project root. Missing: "
            + ", ".join(missing)
        )


def backup(path):
    if not path.exists():
        return
    rel = path.relative_to(ROOT)
    dst = BACKUP_ROOT / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    if path.is_dir():
        if dst.exists():
            shutil.rmtree(str(dst))
        shutil.copytree(str(path), str(dst))
    else:
        shutil.copy2(str(path), str(dst))


def write_text(path, content, newline="\n"):
    path.parent.mkdir(parents=True, exist_ok=True)
    text = textwrap.dedent(content).lstrip("\n")
    path.write_text(text.replace("\n", newline), encoding="utf-8")


def patch_backend_requirements():
    req = """
    # Windows 7 / Python 3.8 compatible backend stack.
    # Django 5.x needs Python 3.10+, so Win7 is pinned to Django 4.2 LTS.
    Django>=4.2,<4.3
    djangorestframework>=3.15,<3.16
    django-cors-headers>=4.3,<4.5
    Pillow>=10.0,<11.0
    openpyxl>=3.1,<4.0
    """
    backup(ROOT / "backend" / "requirements.txt")
    write_text(ROOT / "backend" / "requirements.txt", req)
    write_text(ROOT / "backend" / "requirements-win7.txt", req)


def patch_frontend_package():
    package_path = ROOT / "frontend" / "package.json"
    backup(package_path)
    pkg = json.loads(package_path.read_text(encoding="utf-8"))
    pkg["scripts"] = {
        "dev": "vite --host 127.0.0.1",
        "build": "vite build --mode win7",
        "preview": "vite preview --host 127.0.0.1",
    }
    pkg["dependencies"] = {
        "react": "18.2.0",
        "react-dom": "18.2.0",
    }
    pkg["devDependencies"] = {
        "@vitejs/plugin-react": "4.2.1",
        "vite": "4.5.3",
    }
    package_path.write_text(
        json.dumps(pkg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    env_text = """
    # Used during npm run build for the Windows 7 local package.
    VITE_API_URL=http://127.0.0.1:8000/api
    """
    write_text(ROOT / "frontend" / ".env.win7", env_text)


def patch_vite_config():
    vite_config = ROOT / "frontend" / "vite.config.js"
    backup(vite_config)
    write_text(
        vite_config,
        """
        import { defineConfig } from 'vite';
        import react from '@vitejs/plugin-react';

        export default defineConfig({
          plugins: [react()],
          server: {
            host: '127.0.0.1',
            port: 5173
          },
          preview: {
            host: '127.0.0.1',
            port: 5173
          },
          build: {
            target: 'es2015',
            outDir: 'dist',
            sourcemap: false
          }
        });
        """,
    )


def add_win7_launcher():
    write_text(
        ROOT / "start-win7.bat",
        r"""
        @echo off
        chcp 65001 >nul
        cd /d "%~dp0"
        python start_win7.py
        echo.
        pause
        """,
        newline="\r\n",
    )

    write_text(
        ROOT / "start_win7.py",
        r'''
        # -*- coding: utf-8 -*-
        """Windows 7 launcher for warehouse.

        This launcher runs only Python/Django on Windows 7. It expects the React
        frontend to be prebuilt into frontend/dist on a modern PC.
        """
        from __future__ import print_function

        import hashlib
        import os
        from pathlib import Path
        import shutil
        import signal
        import subprocess
        import sys
        import time
        import webbrowser

        ROOT = Path(__file__).resolve().parent
        BACKEND = ROOT / "backend"
        FRONTEND_DIST = ROOT / "frontend" / "dist"
        VENV = BACKEND / ".venv_win7"
        LOG_DIR = BACKEND / "logs"


        def die(message):
            print("\nОШИБКА: " + message)
            print("")
            raise SystemExit(1)


        def run(cmd, cwd):
            print("\n$ " + " ".join(str(x) for x in cmd), flush=True)
            subprocess.check_call([str(x) for x in cmd], cwd=str(cwd))


        def sha256(path):
            h = hashlib.sha256()
            with path.open("rb") as f:
                for chunk in iter(lambda: f.read(1024 * 1024), b""):
                    h.update(chunk)
            return h.hexdigest()


        def python_bin():
            if os.name == "nt":
                return VENV / "Scripts" / "python.exe"
            return VENV / "bin" / "python"


        def ensure_python_version():
            version = sys.version_info[:3]
            if version < (3, 8):
                die("Нужен Python 3.8.x. На Windows 7 обычно ставят Python 3.8.10.")
            if version >= (3, 10) and os.name == "nt":
                print("Предупреждение: для Windows 7 обычно используется Python 3.8.x.")


        def ensure_frontend_dist():
            index = FRONTEND_DIST / "index.html"
            if not index.exists():
                die(
                    "не найден frontend\\dist\\index.html. "
                    "Сначала соберите frontend на современной машине: build_frontend_modern.bat, "
                    "потом скопируйте проект на Windows 7."
                )


        def ensure_backend():
            req = BACKEND / "requirements.txt"
            marker = VENV / ".requirements.sha256"
            if not req.exists():
                die("не найден backend\\requirements.txt")

            if not VENV.exists():
                run([sys.executable, "-m", "venv", str(VENV)], ROOT)

            py = python_bin()
            if not py.exists():
                die("виртуальное окружение создано некорректно: " + str(py))

            current = sha256(req)
            previous = marker.read_text(encoding="utf-8").strip() if marker.exists() else ""
            if current != previous:
                # Keep pip conservative for Python 3.8/Windows 7 compatibility.
                run([py, "-m", "pip", "install", "--upgrade", "pip<25", "setuptools<70", "wheel"], BACKEND)
                run([py, "-m", "pip", "install", "-r", str(req)], BACKEND)
                marker.write_text(current, encoding="utf-8")

            LOG_DIR.mkdir(exist_ok=True)
            run([py, "manage.py", "migrate"], BACKEND)


        def start_processes():
            env = os.environ.copy()
            env.setdefault("PYTHONUNBUFFERED", "1")
            py = python_bin()

            backend = subprocess.Popen(
                [str(py), "manage.py", "runserver", "127.0.0.1:8000"],
                cwd=str(BACKEND),
                env=env,
            )
            frontend = subprocess.Popen(
                [str(py), "-m", "http.server", "5173", "--bind", "127.0.0.1", "--directory", str(FRONTEND_DIST)],
                cwd=str(ROOT),
                env=env,
            )

            url = "http://127.0.0.1:5173/"
            print("\nBackend/API: http://127.0.0.1:8000/api/")
            print("Frontend:    " + url)
            print("Логи backend: backend\\logs\\backend.log")
            print("Для остановки нажмите Ctrl+C.\n")

            time.sleep(2)
            try:
                webbrowser.open(url)
            except Exception:
                pass

            processes = [backend, frontend]
            try:
                while True:
                    for process in processes:
                        code = process.poll()
                        if code is not None:
                            return code
                    time.sleep(0.5)
            except KeyboardInterrupt:
                print("\nОстанавливаю процессы...")
                for process in processes:
                    if process.poll() is None:
                        if os.name == "nt":
                            process.terminate()
                        else:
                            process.send_signal(signal.SIGTERM)
                for process in processes:
                    try:
                        process.wait(timeout=8)
                    except subprocess.TimeoutExpired:
                        process.kill()
                return 0


        def main():
            ensure_python_version()
            ensure_frontend_dist()
            ensure_backend()
            return start_processes()


        if __name__ == "__main__":
            raise SystemExit(main())
        ''',
    )


def add_build_script():
    write_text(
        ROOT / "build_frontend_modern.bat",
        r"""
        @echo off
        chcp 65001 >nul
        cd /d "%~dp0"

        if not exist frontend\package.json (
          echo ERROR: run this file from the warehouse project root.
          pause
          exit /b 1
        )

        copy /Y frontend\.env.win7 frontend\.env.local >nul

        cd frontend
        if exist package-lock.json del /F /Q package-lock.json
        if exist node_modules rmdir /S /Q node_modules

        call npm install
        if errorlevel 1 exit /b 1

        call npm run build
        if errorlevel 1 exit /b 1

        echo.
        echo Frontend built in frontend\dist.
        echo Now copy the whole warehouse folder to Windows 7 and run start-win7.bat there.
        echo.
        pause
        """,
        newline="\r\n",
    )


def add_readme():
    write_text(
        ROOT / "README_WIN7.md",
        r"""
        # Warehouse Dashboard: запуск на Windows 7

        Этот адаптер переводит проект в режим, пригодный для Windows 7:

        - backend запускается на Python 3.8 + Django 4.2;
        - Node.js/Vite на Windows 7 не нужны;
        - frontend заранее собирается на современной машине в `frontend/dist`;
        - на Windows 7 запускается только Django и простой локальный static server.

        ## 1. Что подготовить

        На современной машине:

        - Git или скачанный ZIP проекта `https://github.com/bebrum/warehouse`;
        - Python 3.x для запуска `apply_win7_patch.py`;
        - Node.js LTS для сборки frontend.

        На Windows 7:

        - Python 3.8.x, практически — Python 3.8.10 для Windows;
        - свежий доступный браузер для Windows 7. Не используйте Internet Explorer.

        ## 2. Применить адаптер

        Скопируйте `apply_win7_patch.py` в корень проекта `warehouse`, где лежат папки
        `backend` и `frontend`, затем выполните:

        ```bat
        python apply_win7_patch.py
        ```

        Скрипт создаст резервные копии перезаписанных файлов в `.win7-backup\...`.

        ## 3. Собрать frontend на современной машине

        В корне проекта выполните:

        ```bat
        build_frontend_modern.bat
        ```

        После успешной сборки должна появиться папка:

        ```text
        frontend\dist\index.html
        ```

        ## 4. Перенести на Windows 7

        Скопируйте весь каталог `warehouse` на Windows 7, например в:

        ```text
        C:\warehouse
        ```

        Затем запустите:

        ```bat
        start-win7.bat
        ```

        Первый запуск создаст `backend\.venv_win7`, установит Python-зависимости,
        применит миграции и откроет:

        ```text
        http://127.0.0.1:5173/
        ```

        Backend будет доступен по адресу:

        ```text
        http://127.0.0.1:8000/api/
        ```

        ## 5. Важные ограничения

        1. Первый запуск backend на Windows 7 требует доступ к PyPI, чтобы скачать
           зависимости. Для полностью офлайн-установки нужно заранее собрать wheelhouse
           под Python 3.8/Windows.

        2. Не запускайте текущий `npm run dev` на Windows 7. Этот адаптер специально
           исключает Node.js из Win7-сценария.

        3. Если нужно открыть сервис с других машин, не публикуйте `runserver` в интернет.
           Используйте VPN/туннель/reverse proxy на современной машине.

        4. Если у вас уже есть рабочая база `backend\db.sqlite3` и папка `backend\media`,
           сохраните их перед переносом.
        """,
    )


def main():
    require_project_root()
    patch_backend_requirements()
    patch_frontend_package()
    patch_vite_config()
    add_win7_launcher()
    add_build_script()
    add_readme()
    print("Windows 7 adapter applied successfully.")
    print("Backups, if any, are in: " + str(BACKUP_ROOT))
    print("Next: run build_frontend_modern.bat on a modern machine, then run start-win7.bat on Windows 7.")


if __name__ == "__main__":
    main()
