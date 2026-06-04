# Backend

Django REST backend для локального складского дашборда.

## Быстрый запуск из корня проекта

```bash
python start.py
```

Скрипт создаёт виртуальное окружение, ставит зависимости, применяет миграции и запускает сервер.

## Ручной запуск

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

На Windows активируйте окружение через:

```powershell
.venv\Scripts\Activate.ps1
```

Часовой пояс настроен на `Asia/Vladivostok`.

Логи backend пишутся в:

```text
backend/logs/backend.log
```
