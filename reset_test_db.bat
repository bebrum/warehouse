@echo off
setlocal
cd /d "%~dp0"

if exist "backend\.venv\Scripts\python.exe" (
    "backend\.venv\Scripts\python.exe" reset_test_db.py
) else (
    python reset_test_db.py
)

pause
