# Code Standards

## General

- Keep modules small and single-purpose. If a file needs "and" to describe what it does, split it. Soft limits: components under 200 lines, other modules under 300.
- Fix root causes, do not layer workarounds. No retry loops, sleeps, or silent catches to hide a bug that has a known cause.
- Do not mix unrelated concerns in one component, route, or service. Rendering, data fetching, formatting, and business rules each live in their own place.
- The inspection event is the single contract between the ML pipeline, the simulator, the API, and the web app. It is defined once in `packages/shared` and imported everywhere. The simulator emits exactly the same shape as the real ML service, with no simulator-only fields.
- The simulated camera and the live camera sit behind the same source interface. No component or route branches on "is this simulated".
- Inspection rules (dimension tolerances, confidence threshold, OCR minimum confidence) are evaluated in one server module and read from config. The UI displays the status the server returns and never recomputes it. No threshold appears as a literal in a component.
- Units live in names and types: `widthMm`, not `width`. Confidence is stored and transported as a 0–1 fraction and converted to a percentage only in the display formatter.
- Timestamps are ISO-8601 UTC strings in storage and transport. Conversion to plant-local display time happens in one formatter utility.
- Do not abstract early. Duplicate once, abstract on the third use.
- No commented-out code, no `console.log` in committed code (use the logger), no `TODO` without an issue reference.
- Comments explain why, not what.
- Every new dependency needs a one-line justification in the PR. Prefer platform and existing-library features first.
- Business rules, schema validation, formatters, and API handlers have tests. Every bug fix ships with a regression test.
- Prettier and ESLint run in CI and are not negotiable in review. Commits follow Conventional Commits.

## TypeScript

- Strict mode is required throughout the project, plus `noUncheckedIndexedAccess` and `noFallthroughCasesInSwitch`.
- Avoid `any`. Use explicit interfaces, `unknown` with narrowing, or narrowly scoped generics. `@typescript-eslint/no-explicit-any` is an error.
- Validate unknown external input at system boundaries before trusting it: ML events, request params/query/body, WebSocket messages, environment variables, URL search params. Use Zod and derive types with `z.infer`. Do not hand-write a type that duplicates a schema.
- No non-null assertions (`!`) and no `as` casts to silence the compiler. A cast is allowed only directly after validation.
- Use `@ts-expect-error` with a reason when unavoidable. `@ts-ignore` is banned.
- Model statuses and defect types as string-literal unions or `as const` objects, not TypeScript `enum`. Switches over them end in an exhaustive `never` check.
- Use discriminated unions for connection state and async state (`loading | ready | error | disconnected`) instead of parallel booleans.
- Database types are generated with `supabase gen types` and committed. Never hand-write a table type.
- Exported functions have explicit return types. Locals rely on inference.
- Use `import type` for type-only imports. Named exports only, except where a tool requires a default export.
- No barrel files except one `index.ts` per feature folder as its public surface.
- `apps/web` and `apps/api` never import from each other. Shared code comes from `@billet-vision/shared`.

## React

- Function components and hooks only. One exported component per file.
- Presentational components receive props and render. Data access lives in hooks or feature-level container components.
- Server data goes through TanStack Query. No `fetch` inside components or ad hoc `useEffect`. Query keys come from one central factory in `lib/`.
- Live events arrive through a single WebSocket client in `lib/realtime`, exposed through one provider and hooks. Components never open sockets. The client reconnects with exponential backoff and jitter.
- Live state is bounded: keep only the most recent 200 events in memory. Older records are fetched from the API through the Inspection Log.
- Never re-render the component tree per video frame. Draw bounding boxes on a `<canvas>` or SVG layer driven by refs. Boxes use normalized coordinates (0–1) and scale to the rendered video size so they stay aligned on resize.
- Derive values during render. Do not mirror props or server data into state with `useEffect`. Use `useMemo` only for measured cost.
- Every data view implements loading, empty, error, and disconnected/stale states as described in `ui-context.md`.
- Every effect that opens a socket, timer, or observer cleans it up.
- List keys are stable IDs (`eventId`, `inspectionId`), never array indexes.
- Use semantic elements: real `<button>`, `<a>`, `<table>`, labelled inputs. New alerts are announced through an `aria-live` region.
- Build on shadcn/ui primitives. Wrap them, do not fork them. Icons come from Lucide only.
- Lazy-load the Analytics and Inspection Log routes so the Live Inspection screen stays light.
- Filters, time range, and pagination live in URL search params so any view can be reloaded or shared.
- No business logic in JSX. Formatting (mm, %, time) goes through `lib/format`.

## Express

- Layering is route → controller → service → repository. Routes declare path and middleware only. Controllers parse input and map results to HTTP. Services hold business logic and know nothing about HTTP. Repositories are the only code that touches the database.
- Keep handlers focused on a single responsibility. No database calls in routes or controllers.
- Async handlers are wrapped so rejections reach the central error middleware. One error middleware maps typed `AppError` subclasses to the standard error response. Stack traces never reach the client.
- One `config` module validates all environment variables with Zod at startup and fails fast. `process.env` is not read anywhere else.
- Supabase is accessed only from `apps/api`, through one client in `src/db/` using the service role key. The key is never sent to the browser, never logged, and never imported by `apps/web`.
- Real-time push lives in its own module. Services publish domain events to an internal event bus and the socket layer subscribes. The ingest route never writes to sockets directly.
- Structured logging with pino and a request ID on every request. Never log secrets or image data.
- Baseline hardening on every route: `helmet`, a CORS allowlist from config, rate limiting, and a body size limit.
- Shut down gracefully on `SIGTERM`: stop accepting requests, close sockets, drain the database pool.
- The simulator runs as a separate process and posts to the same ingest endpoint the ML service will use.

## Styling

- Use CSS custom property tokens defined in `styles/tokens.css` and mapped into the Tailwind theme. No hardcoded hex or rgb values in components, charts, or canvas code. Canvas and chart code reads token values through a shared helper.
- Follow the border radius scale defined in `ui-context.md`. No ad hoc radii.
- Spacing comes from the 4px-grid spacing tokens. No arbitrary Tailwind values such as `p-[13px]`, except for computed geometry like bounding boxes.
- Font sizes come only from the type scale. No text is smaller than 13px anywhere, including chart ticks and overlay labels.
- Status colors (pass, fail, rework, review) come only from the status tokens and always appear with an icon and a text label, never as color alone.
- No inline `style` except computed geometry. No `!important`. No global element selectors outside the base layer.
- Component variants use `cva` or data attributes, not sprawling conditional class strings.
- No gradients, glows, glass effects, or decorative shadows. Elevation follows the two levels defined in `ui-context.md`.
- Interactive elements always show a visible `:focus-visible` ring. Motion respects `prefers-reduced-motion`.
- Fonts are self-hosted. The dashboard must work on a plant network with no internet access.

## API Routes

- Versioned base path `/api/v1`. Plural resource nouns, kebab-case paths.
- Validate and parse request input (params, query, body) with Zod before any logic runs. Request bodies reject unknown keys.
- Enforce authentication and authorization before any mutation. The ML ingest route authenticates with a service API key compared in constant time. Operator routes use user authentication with role checks in middleware.
- The ingest endpoint is idempotent on `eventId`. A duplicate event returns success and does not create a second record.
- Return consistent, predictable response shapes. Success: `{ "data": ..., "meta": ... }`. Error: `{ "error": { "code": "UPPER_SNAKE_CODE", "message": "...", "details": ... } }`. Messages are safe to show to users.
- Use correct status codes: 200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500.
- List endpoints paginate on the server (default 50, maximum 200). Sortable and filterable fields are whitelisted and parsed through a schema.
- Analytics endpoints accept a preset range or explicit `from` and `to`, and return pre-aggregated buckets, never raw rows.
- The Excel export endpoint accepts the same filters as the list endpoint, streams the `.xlsx` response from keyset-paginated chunks without buffering the whole file, and enforces a configurable maximum row count with a clear error beyond it.
- Real-time messages use the envelope `{ "type": "...", "data": ... }` and carry the same shapes as the REST resources. Both ends validate them against the shared schema.
- Never return database rows directly. Map them through response DTOs.
- `GET` requests have no side effects.

## Data and Storage

- Metadata belongs in the database (Supabase Postgres): inspection records (ID, billet ID, inspected-at, length/width/height in mm, defects, confidence, status, model version), alerts, and alert acknowledgements.
- Large generated content belongs in file or blob storage: billet snapshots and camera frame crops. The database stores only the storage key. Use Supabase Storage with private buckets and short-lived signed URLs. Local development uses `supabase start`.
- Do not store large content directly in the database, and do not embed images or base64 in events or socket messages. Events carry a reference.
- Excel exports are generated on demand and streamed. They are not persisted.
- Inspection records are append-only. A rework re-inspection creates a new record. `billet_id` is not unique, so every inspection has its own UUID primary key.
- Timestamps are `timestamptz` in UTC. Dimension columns carry the unit in the name (`width_mm`). Confidence is stored as a 0–1 numeric with a check constraint.
- Status and defect-type values match the shared literals through DB enums or lookup tables.
- Index `inspected_at`, `status`, and `billet_id`. Analytics use SQL aggregation, not application-side loops over fetched rows.
- Schema changes happen only through Supabase CLI migrations in `supabase/migrations/`, reviewed in PRs. No edits through the dashboard on a shared project.
- Enable Row Level Security on every table with no policies, so the public API denies all access. Only the Express service role reads or writes.
- Analytics aggregations are Postgres functions or views called through `rpc`, not row fetches summed in Node.
- Retention is config-driven. Image retention is shorter than record retention.
- Development seed data comes from the simulator, not hand-written SQL.

## File Organization

Monorepo managed with pnpm workspaces. File names are kebab-case, component exports are PascalCase, and tests sit next to the file they cover as `*.test.ts(x)`.

- `apps/web/` — React + Vite single-page application.
- `apps/web/src/features/` — One folder per product area: `live-inspection/`, `alerts/`, `analytics/`, `inspection-log/`. Each owns its components, hooks, and API calls and exposes a single `index.ts`.
- `apps/web/src/components/ui/` — shadcn primitives and generic reusable components with no feature logic.
- `apps/web/src/components/layout/` — App shell, header, and navigation.
- `apps/web/src/lib/` — API client, realtime client, formatters, query keys, token-reading helpers.
- `apps/web/src/styles/` — `tokens.css` and base styles.
- `apps/api/` — Express application.
- `apps/api/src/routes/` — Route definitions only.
- `apps/api/src/controllers/` — Request parsing and HTTP mapping.
- `apps/api/src/services/` — Business logic, including the inspection-rules module.
- `apps/api/src/repositories/` — All database access.
- `apps/api/src/middleware/` — Auth, validation, error handling, rate limiting.
- `apps/api/src/realtime/` — WebSocket/SSE server and event-bus subscribers.
- `apps/api/src/config/` — Validated environment configuration.
- `apps/api/src/db/` — Supabase client and generated types.
- `supabase/` — CLI config, migrations, and seed files.
- `packages/shared/` — Zod schemas, inferred types, and constants (statuses, defect types) used by web, api, and simulator.
- `tools/simulator/` — Simulated camera feed and inspection-event generator. Never imported by the apps.
- `docs/` — `project-overview.md`, `code-standards.md`, `ui-context.md`, and the inspection-event contract.
