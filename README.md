# Geonesis frontend

Next.js interface for text/image mesh generation, NURBS conversion, private
albums, the public gallery, and administrator-managed credits. Generation and
conversion run through the separate FastAPI backend. A valid converter license
is required for NURBS conversion; the frontend does not contain that program.

## Local development

Use Node.js 22. Copy `.env.local.example` to `.env.local`, point the API URL at
your local backend, then run:

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>. A backend at `http://localhost:8000/v1` is the
default for standalone local development. In the parent repository's Docker
stack, `NEXT_PUBLIC_API_URL=/v1` uses the same-origin backend proxy instead.
Provider API keys belong only in the backend environment and must never be
placed in `NEXT_PUBLIC_*` variables or this frontend repository.

## Checks

```bash
npm test
npm run typecheck
npm run lint:changed
npm run build
```

The tests use Node's test runner and compile the actual TypeScript modules
with mocked network responses. They never submit a real generation or charge
credits. They cover upload formats and limits, retry keys, API request headers,
gallery query cancellation, and automatic/manual post-processing polling.

`lint:changed` checks the affected files and rejects new findings. It reports
an existing baseline of 13 React Hooks findings in the job page's progress
rendering (refs, render-time clocks, effect initialization, and recursive poll
callback). `npm run lint` remains the full repository audit. CI runs the above
checks on pull requests and `codex/**` branches without deployment or API keys.
The production build currently downloads the configured Geist fonts from
Google, so it requires outbound network access.

## Interface behavior

- Upload one JPEG, PNG, or WebP up to 16 MB; drag/drop and file selection share
  validation. Accepted previews are released when replaced or removed.
- Galleries use 12 models per page. Searching, switching tabs, or changing an
  album returns to page 1; late requests cannot overwrite the current query.
- Credits show the available balance after reservations. Self-service test
  credits appear only when the backend explicitly enables them in development.
- Generation, conversion, test top-ups, and administrator credit adjustments
  reuse an idempotency key after a request failure, until the inputs change or
  the server acknowledges success. Refreshing the page starts a new attempt.

The frontend needs the corresponding backend additions: credit capabilities,
idempotency headers, album-filtered pagination, and `/v1/jobs/albums`.
