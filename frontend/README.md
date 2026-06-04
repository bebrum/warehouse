# Frontend

React/Vite frontend для дашборда кладовщика.

## Быстрый запуск из корня проекта

```bash
python start.py
```

## Ручной запуск

```bash
npm install
npm run dev
```

По умолчанию frontend обращается к API:

```text
http://127.0.0.1:8000/api
```

Можно переопределить адрес через `.env.local`:

```text
VITE_API_URL=http://127.0.0.1:8000/api
```
