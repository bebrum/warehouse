from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
MANAGE = BACKEND / "manage.py"
DB_FILE = BACKEND / "db.sqlite3"
API_MIGRATIONS = BACKEND / "api" / "migrations"


def run(command: list[str], cwd: Path) -> None:
    print("\n$ " + " ".join(command))
    subprocess.run(command, cwd=str(cwd), check=True)


def main() -> int:
    if not MANAGE.exists():
        print("Ошибка: не найден backend/manage.py. Запускайте скрипт из корня проекта warehouse-dashboard.")
        return 1

    python_exe = sys.executable
    print(f"Python: {python_exe}")

    if DB_FILE.exists():
        print(f"Удаляю тестовую SQLite БД: {DB_FILE}")
        try:
            DB_FILE.unlink()
        except PermissionError:
            print("Не удалось удалить db.sqlite3: файл занят. Остановите backend/frontend через Ctrl+C и запустите скрипт снова.")
            return 1
    else:
        print("db.sqlite3 не найден — пропускаю удаление БД.")

    API_MIGRATIONS.mkdir(parents=True, exist_ok=True)
    init_file = API_MIGRATIONS / "__init__.py"
    init_file.touch(exist_ok=True)

    for path in API_MIGRATIONS.glob("[0-9]*.py"):
        print(f"Удаляю старую миграцию api: {path.name}")
        path.unlink()

    pycache = API_MIGRATIONS / "__pycache__"
    if pycache.exists():
        print("Удаляю кэш миграций api: __pycache__")
        shutil.rmtree(pycache)

    run([python_exe, "manage.py", "makemigrations", "api"], BACKEND)
    run([python_exe, "manage.py", "migrate"], BACKEND)
    run([python_exe, "manage.py", "check"], BACKEND)

    print("\nГотово. Тестовая БД пересоздана, миграции api собраны заново из текущих models.py.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
