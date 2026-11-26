# Forge IDE frontend

React, TypeScript, Vite, and Monaco based online editor UI.

## Development

```sh
npm install
npm run dev
```

## Run Python and Rust

Start the FastAPI service on `http://localhost:8000` and the frontend with
`npm run dev`. Vite proxies `/api/run` to the backend's `/run` endpoint. The
frontend sends `{ language, code }` and displays the returned stdout or stderr.

Set `VITE_EXECUTION_API_URL` in `.env.local` only when the backend is hosted at a
different URL.
