# Firebase Auth Migration Workspace

This folder holds the one-off tooling used to migrate Thaasbai from Firebase to Supabase. It is not runtime app code.

Observed state:

- Firebase Auth users: about 12.
- Providers: Google and email/password.
- Password hash algorithm: Firebase `SCRYPT`.
- Supabase Auth users before migration: none.

## Secret Files

Keep all secret files under ignored paths:

- `supabase/auth-migration/secrets/firebase-service.json`
- `supabase/auth-migration/secrets/supabase-service.json`
- `supabase/auth-migration/secrets/hash-parameters.txt`
- `supabase/auth-migration/exports/users.json`

Do not commit or paste these values into chat.

Safe examples with placeholder values live next to this README:

- `supabase/auth-migration/supabase-service.example.json`
- `supabase/auth-migration/hash-parameters.example.txt`

If validation reports `host still contains placeholder region`, replace
`aws-0-region.pooler.supabase.com` with the exact Session Pooler host from
Supabase `Connect` -> `Session pooler` -> `View parameters`. It usually
contains a real region name such as `ap-southeast-1`, `us-east-1`, or similar.

## Planned Tooling

Use Supabase's official Firebase Auth migration tooling:

- Export Firebase users with `firestoreusers2json`.
- Import the exported JSON into Supabase Auth with `import_users`.

Official guide:

- https://supabase.com/docs/guides/platform/migrating-to-supabase/firebase-auth

This project wraps the export/validation steps in:

```bash
node supabase/auth-migration/migrate-auth.cjs validate-secrets
node supabase/auth-migration/migrate-auth.cjs export
node supabase/auth-migration/migrate-auth.cjs validate-export
```

The export is written to the ignored path:

- `supabase/auth-migration/exports/users.json`

## Important Mapping Step

Supabase Auth user IDs are UUIDs. Firebase user IDs are not guaranteed to be UUIDs and are used as document IDs in existing Firestore data.

After importing auth users, populate:

- `public.auth_migration_map.firebase_uid`
- `public.auth_migration_map.supabase_user_id`
- `public.profiles.legacy_firebase_uid`

Every Firestore data migration should use that mapping rather than guessing user IDs.

The mapping table has been created by:

- `supabase/migrations/202609300002_auth_migration_mapping.sql`

Do not import Firestore user-owned data until `auth_migration_map` is populated and spot-checked.

## Firestore Data Migration

Run a read-only inventory first:

```bash
node supabase/auth-migration/migrate-firestore.cjs summary
```

Then import and verify:

```bash
node supabase/auth-migration/migrate-firestore.cjs import
node supabase/auth-migration/migrate-firestore.cjs verify
```

Imported on 2026-09-30:

- 12 profiles/stats/rank progress rows mapped from Firebase Auth.
- 7 Firebase economy docs merged into Supabase wallets/equipped cosmetics.
- 36 coin transactions, 8 room cards, 42 missions, 70 achievements, and 49 daily rewards.
- 12 friend requests, 6 room invites, 1 club, 10 matches, 25 rooms, 6 coin topup requests, and 1 Hall of Fame row.

