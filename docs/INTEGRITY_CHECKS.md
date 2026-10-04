# Integrity Checks

`.github/workflows/integrity.yml` runs two independent jobs on pull requests,
pushes and manual workflow dispatch. It has only `contents: read` permission,
disables persisted checkout credentials, references no workflow secrets, and
does not deploy, publish, push or commit anything. Dependency installation, the
official PostgreSQL image pull and Next.js Google-font build downloads require
network access; tests never target a production backend.

## Core Gate

Use Node 22 and install the root lockfile with `npm ci`. The currently installed
Supabase JS packages (2.117.2) require Node `>=22.0.0`; Node 20 is insufficient.
CI uses engine-strict installation, and the runner checks each installed
`@supabase/*` package's declared Node range before running any suites.

```sh
npm ci
node scripts/check-integrity-core.cjs
```

The runner uses `process.execPath`, a repository-relative fixed inventory and a
repository root derived from its own file, so the caller's working directory and
shell do not determine execution. Suites run sequentially in separate processes.
The first failed suite stops the gate and propagates its numeric exit code;
launch errors, signals and the three-minute per-suite timeout return failure.
Children receive an OS environment allowlist, excluding backend URLs, credentials,
`NODE_OPTIONS` and `NODE_PATH`. The runner reads no environment or credential files.
There is no `npx`, package download or browser-runtime fallback in this command.

| Included suite | Coverage |
| --- | --- |
| `check-integrity-core-runner.cjs` | Real child sequencing, failure propagation, launch/signal/timeout handling, argument rejection, environment isolation and Node requirements |
| `check-game-rules.ts` | Existing Mindi/Gin rules, loaded in an isolated child using installed TypeScript without emitting files |
| `check-auth-integrity-types.cjs` | Focused auth and recovery TypeScript diagnostics |
| `check-social-integrity.cjs` | Mutation adapters, pagination, realtime lifecycle mocks, errors and SQL source contracts |
| `check-friends-loading.cjs` | Bounded profile batches, deduplication, empty-list subscriptions and failures |
| `check-economy-integrity.cjs` | Economy reducer/provider and wallet contracts with mocked I/O |
| `check-match-authority.cjs` | Trusted game logic and command handler with mocked backend, without `--db` |
| `check-private-room-integrity.cjs` | Private-room client, lobby display and RPC contracts |
| `check-query-integrity.cjs` | Real Supabase query construction with fake fetch, ranking/history and calendar/lifecycle checks across time zones |
| `check-query-integrity-tooling.cjs` | Source inventory, database target safeguards and preview HTTP behavior using temporary files and loopback only |
| `check-post-match-integration.cjs` | Mocked post-match results, public appearance, room fixtures and compatibility/types |

The workflow additionally runs `npm run verify`, `npm run build:match-server` and
`npm run build`. Build-only public Supabase values use a reserved `.invalid` URL,
a dummy publishable key and an anon JWT signed with the public string
`integrity-ci-fixture-key-not-a-secret`.
They are syntax fixtures, not working authentication credentials. The current
client reads the publishable key; the anon fixture supports anon-key consumers.
The build creates artifacts only inside the disposable CI checkout.

## Local Database Gate

The separate Ubuntu job starts an official `postgres:16-bookworm` container named
`thaasbai-audit-db`, publishing only `127.0.0.1:55439` with the fixed disposable
password `local-audit-only`. Data lives on a container tmpfs. It refuses an existing
container with that name, records the new container ID, and labels it with the job's
run identity. Cleanup runs even after failure and removes only that recorded ID
after verifying its label, name and local Docker socket. It never prunes Docker
resources or removes an unrelated container.

The job invokes the existing `check-integrity-db.cjs` without `--scoped` or
`--keep-database`. The runner checks its local Docker context and official image,
creates a uniquely named scratch database, applies **all** matching migration SQL
files in sorted order, and drops only that scratch database in `finally`. SQL
fixtures roll back; concurrent CAS fixtures are deleted and cleanup is checked.
Migration or suite failures fail the job; no failure is converted into a skip.

The runner bootstraps its actual fixture schema: `auth.users` with metadata,
anonymous-account and timestamp fields; `auth.jwt()`, `auth.uid()` and
`auth.role()`; `anon`, `authenticated` and bypass-RLS `service_role`; the
`extensions` schema, Supabase-like default grants and `supabase_realtime`
publication. This is an emulated SQL auth environment, not a running Supabase
Auth or Realtime service.

Database suites cover ranking/history and role policies, private hand visibility,
match authority/CAS/settlement including concurrent sessions, social policies,
economy actions, verified progress and private-room RPCs. The room suite requires
`pg` through a Git-ignored migration-tool path. CI installs exactly `pg@8.7.1`
with scripts disabled in `$RUNNER_TEMP/integrity-pg`, and supplies it with
`NODE_PATH`. It does not install or invoke the migration tool, read its secrets,
or alter the repository manifests/lockfiles.

For configuration and migration inventory only, without invoking Docker:

```sh
node scripts/check-integrity-db.cjs --check
```

For an already provisioned local audit container and fixture `pg` client:

```sh
node scripts/check-integrity-db.cjs
```

Do not point this runner at an existing application database. Its container,
scratch database naming and connection targets cannot be overridden.

## Excluded Coverage

This gate does not run `check-auth-integrity.cjs`, `check-casual-matchmaking.cjs`,
`check-online-authority-ui.cjs`, `check-messages-ui.cjs`, `check-friends-ui.cjs`,
`check-room-ui.cjs` or the other Playwright/viewport/gameplay scripts. Those
currently require separately installed browser tooling, and several default to
a workstation-specific module path or Edge channel. Auth types and mocked
service checks do not validate real browser auth flows, focus, rendering or chat
interactions.

Credential-reading live database scripts such as `check-wallet-concurrency.cjs`,
`check-five-bugs-db.cjs`, `check-matchmaking-db.cjs` and `check-guest-audit-db.cjs`,
as well as migration-application tools, are excluded. The local SQL job covers
its named fixtures only. It does not validate hosted Supabase Auth/email/OAuth,
PostgREST, Realtime delivery, deployed Edge Functions, production data or a live
multiplayer session. Passing CI is not full browser or live integration coverage.
