# Forge IDE frontend

React, TypeScript, Vite, and Monaco based online editor UI.

## Development

```sh
npm install
npm run dev
```

## Execution service

The current backend does not include a code execution route. To enable Run, set
`VITE_EXECUTION_API_URL` to a trusted runner endpoint. The frontend sends a JSON
POST request with `language` (`javascript`, `python`, `cpp`, or `rust`), `source`,
`input`, and `filename`. It expects a JSON response containing `stdout`, `stderr`,
optional `durationMs` (or `duration_ms`), and optional `status`. The UI reports the
runner as unavailable when the endpoint is unset; it never evaluates code locally.

Copy `.env.example` to `.env.local` and set the endpoint to configure a runner.
