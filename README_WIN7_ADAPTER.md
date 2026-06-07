# Warehouse Win7 adapter

Пакет предназначен для проекта https://github.com/bebrum/warehouse.

## Использование

1. Скачайте или клонируйте оригинальный проект `warehouse`.
2. Скопируйте файл `apply_win7_patch.py` в корень проекта, рядом с папками `backend` и `frontend`.
3. Выполните:

```bat
python apply_win7_patch.py
```

После этого в проекте появятся:

- `README_WIN7.md` — подробная инструкция;
- `start-win7.bat` и `start_win7.py` — запуск на Windows 7;
- `build_frontend_modern.bat` — сборка frontend на современной машине;
- `backend/requirements-win7.txt` — зависимости под Python 3.8/Django 4.2;
- обновлённые `backend/requirements.txt`, `frontend/package.json`, `frontend/vite.config.js`.

## Идея сборки

На Windows 7 запускается только Python/Django backend и статическая раздача уже собранного frontend. Node.js/Vite на Windows 7 не требуются.
