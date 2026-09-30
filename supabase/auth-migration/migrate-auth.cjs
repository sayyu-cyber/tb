#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createRequire } = require("module");

const root = path.resolve(__dirname, "../..");
const toolRequire = createRequire(path.join(__dirname, "tools/firebase-to-supabase/package.json"));
const admin = toolRequire("firebase-admin");
const { Client } = toolRequire("pg");

const paths = {
  firebaseService: path.join(__dirname, "secrets/firebase-service.json"),
  supabaseService: path.join(__dirname, "secrets/supabase-service.json"),
  hashParameters: path.join(__dirname, "secrets/hash-parameters.txt"),
  exportsDir: path.join(__dirname, "exports"),
  usersExport: path.join(__dirname, "exports/users.json"),
};

function ensureFile(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${path.relative(root, file)}`);
  }
}

function readJson(file) {
  ensureFile(file);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function summarizeProviders(users) {
  const counts = new Map();
  for (const user of users) {
    const providers = Array.isArray(user.providerData) ? user.providerData : [];
    for (const provider of providers) {
      const key = provider.providerId || "unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    if (!providers.length) counts.set("none", (counts.get("none") ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function validateExport(users) {
  const problems = [];
  const seenUids = new Set();
  const seenEmails = new Set();
  let passwordUsers = 0;
  let passwordHashUsers = 0;

  users.forEach((user, index) => {
    if (!user.uid) problems.push(`user[${index}] missing uid`);
    if (seenUids.has(user.uid)) problems.push(`duplicate uid at user[${index}]`);
    seenUids.add(user.uid);

    if (user.email) {
      const email = String(user.email).toLowerCase();
      if (seenEmails.has(email)) problems.push(`duplicate email at user[${index}]`);
      seenEmails.add(email);
    }

    const providers = Array.isArray(user.providerData) ? user.providerData : [];
    if (providers.some((provider) => provider.providerId === "password")) {
      passwordUsers++;
      if (user.passwordHash && user.passwordSalt) passwordHashUsers++;
    }
  });

  return {
    count: users.length,
    providers: summarizeProviders(users),
    passwordUsers,
    passwordHashUsers,
    problems,
  };
}

async function exportUsers() {
  const serviceAccount = readJson(paths.firebaseService);
  fs.mkdirSync(paths.exportsDir, { recursive: true });

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
    });
  }

  const users = [];
  let pageToken;
  do {
    const result = await admin.auth().listUsers(100, pageToken);
    users.push(...result.users.map((user) => user.toJSON()));
    pageToken = result.pageToken;
  } while (pageToken);

  fs.writeFileSync(paths.usersExport, `${JSON.stringify(users, null, 2)}\n`, "utf8");
  const summary = validateExport(users);
  console.log(JSON.stringify(summary, null, 2));
}

function validateUsersExport() {
  const users = readJson(paths.usersExport);
  const summary = validateExport(users);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.problems.length) process.exitCode = 1;
}

function validateSecrets() {
  ensureFile(paths.firebaseService);
  ensureFile(paths.supabaseService);
  ensureFile(paths.hashParameters);
  readJson(paths.firebaseService);
  const supabase = readJson(paths.supabaseService);
  const supabaseProblems = [];
  for (const key of ["host", "password", "user", "database", "port"]) {
    if (supabase[key] === undefined || supabase[key] === null || String(supabase[key]).trim() === "") {
      supabaseProblems.push(`missing ${key}`);
    }
  }
  if (String(supabase.host ?? "").includes("region")) supabaseProblems.push("host still contains placeholder region");
  if (String(supabase.user ?? "").includes("PROJECT_REF")) supabaseProblems.push("user still contains placeholder PROJECT_REF");
  if (String(supabase.password ?? "").includes("YOUR_")) supabaseProblems.push("password still looks like a placeholder");
  const hash = fs.readFileSync(paths.hashParameters, "utf8");
  const required = [
    /algorithm:\s*SCRYPT/,
    /base64_signer_key:/,
    /base64_salt_separator:/,
    /rounds:\s*\d+/,
    /mem_cost:\s*\d+/,
  ];
  const missing = required.filter((pattern) => !pattern.test(hash)).map(String);
  console.log(JSON.stringify({ ok: missing.length === 0 && supabaseProblems.length === 0, missing, supabaseProblems }, null, 2));
  if (missing.length || supabaseProblems.length) process.exitCode = 1;
}

function parseHashParameters() {
  ensureFile(paths.hashParameters);
  const text = fs.readFileSync(paths.hashParameters, "utf8");
  const params = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([a-zA-Z0-9_]+)\s*:\s*(.+?)\s*,?\s*$/);
    if (match) params[match[1]] = match[2];
  }

  const required = ["algorithm", "base64_signer_key", "base64_salt_separator", "rounds", "mem_cost"];
  const missing = required.filter((key) => !params[key]);
  if (missing.length) throw new Error(`Missing hash parameter(s): ${missing.join(", ")}`);
  if (params.algorithm !== "SCRYPT") throw new Error(`Unsupported hash algorithm: ${params.algorithm}`);

  return {
    signerKey: params.base64_signer_key,
    saltSeparator: params.base64_salt_separator,
    rounds: Number.parseInt(params.rounds, 10),
    memoryCost: Number.parseInt(params.mem_cost, 10),
  };
}

function firebaseScryptPassword(user, hashParams) {
  if (!user.passwordHash || !user.passwordSalt) return null;
  return [
    `$fbscrypt$v=1,n=${hashParams.memoryCost},r=${hashParams.rounds},p=1,ss=${hashParams.saltSeparator},sk=${hashParams.signerKey}`,
    user.passwordSalt,
    user.passwordHash,
  ].join("$");
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function providersFor(user) {
  const ids = new Set();
  for (const provider of user.providerData || []) {
    if (provider.providerId === "password") ids.add("email");
    if (provider.providerId === "google.com") ids.add("google");
  }
  return [...ids];
}

function buildImportRows(users, hashParams) {
  const duplicateEmail = new Set();
  const seenEmail = new Set();
  for (const user of users) {
    if (!user.email) continue;
    const email = String(user.email).toLowerCase();
    if (seenEmail.has(email)) duplicateEmail.add(email);
    seenEmail.add(email);
  }
  if (duplicateEmail.size) throw new Error(`Duplicate emails in export: ${[...duplicateEmail].join(", ")}`);

  return users.map((user) => {
    if (!user.uid) throw new Error("Firebase user missing uid");
    if (!user.email) throw new Error(`Firebase user ${user.uid} is missing email; importer expects email-backed accounts`);

    const id = crypto.randomUUID();
    const createdAt = toDate(user.metadata?.creationTime) || new Date();
    const updatedAt = new Date();
    const lastSignInAt = toDate(user.metadata?.lastSignInTime);
    const emailConfirmedAt = user.emailVerified ? (lastSignInAt || createdAt) : null;
    const providers = providersFor(user);
    if (!providers.length) throw new Error(`Firebase user ${user.uid} has no supported provider`);

    const encryptedPassword = providers.includes("email") ? firebaseScryptPassword(user, hashParams) : null;
    if (providers.includes("email") && !encryptedPassword) {
      throw new Error(`Firebase password user ${user.uid} is missing password hash or salt`);
    }

    const primaryProvider = providers.includes("google") ? "google" : "email";
    const appMeta = { provider: primaryProvider, providers };
    const userMeta = {
      firebase_uid: user.uid,
      full_name: user.displayName || null,
      name: user.displayName || null,
      avatar_url: user.photoURL || null,
      picture: user.photoURL || null,
    };

    const identities = [];
    for (const provider of user.providerData || []) {
      if (provider.providerId === "password") {
        identities.push({
          id: crypto.randomUUID(),
          provider: "email",
          provider_id: user.email,
          user_id: id,
          email: user.email,
          identity_data: {
            sub: id,
            email: user.email,
            email_verified: Boolean(user.emailVerified),
            phone_verified: false,
          },
          created_at: createdAt,
          updated_at: updatedAt,
          last_sign_in_at: lastSignInAt,
        });
      }
      if (provider.providerId === "google.com") {
        identities.push({
          id: crypto.randomUUID(),
          provider: "google",
          provider_id: provider.uid,
          user_id: id,
          email: provider.email || user.email,
          identity_data: {
            sub: provider.uid,
            email: provider.email || user.email,
            email_verified: Boolean(user.emailVerified),
            name: provider.displayName || user.displayName || null,
            full_name: provider.displayName || user.displayName || null,
            avatar_url: provider.photoURL || user.photoURL || null,
            picture: provider.photoURL || user.photoURL || null,
            provider_id: provider.uid,
          },
          created_at: createdAt,
          updated_at: updatedAt,
          last_sign_in_at: lastSignInAt,
        });
      }
    }

    return {
      firebaseUid: user.uid,
      id,
      email: user.email,
      encryptedPassword,
      emailConfirmedAt,
      lastSignInAt,
      createdAt,
      updatedAt,
      appMeta,
      userMeta,
      providers,
      identities,
    };
  });
}

async function inspectSupabaseAuthSchema() {
  const credentials = readJson(paths.supabaseService);
  const client = new Client(credentials);
  await client.connect();
  try {
    const users = await client.query(
      "select column_name, data_type, is_nullable from information_schema.columns where table_schema = 'auth' and table_name = 'users' order by ordinal_position"
    );
    const identities = await client.query(
      "select column_name, data_type, is_nullable from information_schema.columns where table_schema = 'auth' and table_name = 'identities' order by ordinal_position"
    );
    const authUsersCount = await client.query("select count(*)::int as count from auth.users");
    console.log(
      JSON.stringify(
        {
          authUsersCount: authUsersCount.rows[0].count,
          usersColumns: users.rows,
          identitiesColumns: identities.rows,
        },
        null,
        2
      )
    );
  } finally {
    await client.end();
  }
}

async function inspectSupabaseAuthConstraints() {
  const credentials = readJson(paths.supabaseService);
  const client = new Client(credentials);
  await client.connect();
  try {
    const constraints = await client.query(
      `
      select
        n.nspname as schema,
        c.relname as table,
        con.conname as name,
        con.contype as type,
        pg_get_constraintdef(con.oid) as definition
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'auth'
        and c.relname in ('users', 'identities')
      order by c.relname, con.conname
      `
    );
    const indexes = await client.query(
      `
      select schemaname as schema, tablename as table, indexname as name, indexdef as definition
      from pg_indexes
      where schemaname = 'auth'
        and tablename in ('users', 'identities')
      order by tablename, indexname
      `
    );
    console.log(JSON.stringify({ constraints: constraints.rows, indexes: indexes.rows }, null, 2));
  } finally {
    await client.end();
  }
}

async function withSupabaseClient(callback) {
  const credentials = readJson(paths.supabaseService);
  const client = new Client(credentials);
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

async function importUsers({ dryRun }) {
  const users = readJson(paths.usersExport);
  const exportSummary = validateExport(users);
  if (exportSummary.problems.length) {
    throw new Error(`Export validation failed: ${exportSummary.problems.join("; ")}`);
  }

  const hashParams = parseHashParameters();
  const rows = buildImportRows(users, hashParams);
  const importSummary = {
    dryRun,
    users: rows.length,
    identities: rows.reduce((total, row) => total + row.identities.length, 0),
    providers: rows.reduce((acc, row) => {
      for (const provider of row.providers) acc[provider] = (acc[provider] ?? 0) + 1;
      return acc;
    }, {}),
    passwordHashUsers: rows.filter((row) => Boolean(row.encryptedPassword)).length,
  };

  await withSupabaseClient(async (client) => {
    const authUsersCount = await client.query("select count(*)::int as count from auth.users");
    if (authUsersCount.rows[0].count > 0) {
      throw new Error(`Supabase Auth already has ${authUsersCount.rows[0].count} user(s); refusing to import into a non-empty auth.users table`);
    }

    if (dryRun) {
      console.log(JSON.stringify({ ...importSummary, authUsersCount: authUsersCount.rows[0].count }, null, 2));
      return;
    }

    await client.query("begin");
    try {
      for (const row of rows) {
        await client.query(
          `
          insert into auth.users (
            instance_id, id, aud, role, email, encrypted_password,
            email_confirmed_at, invited_at,
            confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at,
            email_change_token_new, email_change, email_change_sent_at,
            last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
            is_super_admin, created_at, updated_at,
            phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at,
            email_change_token_current, email_change_confirm_status,
            is_sso_user, is_anonymous
          )
          values (
            '00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', $2, $3,
            $4, $5,
            '', null, '', null,
            '', '', null,
            $6, $7::jsonb, $8::jsonb,
            false, $9, $10,
            null, null, '', '', null,
            '', 0,
            false, false
          )
          `,
          [
            row.id,
            row.email,
            row.encryptedPassword,
            row.emailConfirmedAt,
            row.createdAt,
            row.lastSignInAt,
            JSON.stringify(row.appMeta),
            JSON.stringify(row.userMeta),
            row.createdAt,
            row.updatedAt,
          ]
        );

        for (const identity of row.identities) {
          await client.query(
            `
            insert into auth.identities (
              id, provider_id, user_id, identity_data, provider,
              last_sign_in_at, created_at, updated_at
            )
            values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
            `,
            [
              identity.id,
              identity.provider_id,
              identity.user_id,
              JSON.stringify(identity.identity_data),
              identity.provider,
              identity.last_sign_in_at,
              identity.created_at,
              identity.updated_at,
            ]
          );
        }

        await client.query(
          `
          insert into public.auth_migration_map (firebase_uid, supabase_user_id, email, providers)
          values ($1, $2, $3, $4)
          `,
          [row.firebaseUid, row.id, row.email, row.providers]
        );

        await client.query(
          "update public.profiles set legacy_firebase_uid = $1 where id = $2",
          [row.firebaseUid, row.id]
        );
      }

      await client.query("commit");
      console.log(JSON.stringify(importSummary, null, 2));
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
}

async function verifyImport() {
  await withSupabaseClient(async (client) => {
    const result = await client.query(
      `
      select
        (select count(*)::int from auth.users) as auth_users,
        (select count(*)::int from auth.identities) as auth_identities,
        (select count(*)::int from public.auth_migration_map) as migration_map,
        (select count(*)::int from public.profiles where legacy_firebase_uid is not null) as profiles_with_legacy_uid,
        (select count(*)::int from auth.users where encrypted_password like '$fbscrypt$%') as firebase_scrypt_passwords,
        (select coalesce(jsonb_object_agg(provider, count), '{}'::jsonb)
         from (
           select provider, count(*)::int as count
           from auth.identities
           group by provider
         ) providers) as providers
      `
    );
    console.log(JSON.stringify(result.rows[0], null, 2));
  });
}

async function main() {
  const command = process.argv[2];
  if (command === "validate-secrets") return validateSecrets();
  if (command === "export") return exportUsers();
  if (command === "validate-export") return validateUsersExport();
  if (command === "inspect-supabase-auth-schema") return inspectSupabaseAuthSchema();
  if (command === "inspect-supabase-auth-constraints") return inspectSupabaseAuthConstraints();
  if (command === "dry-run-import") return importUsers({ dryRun: true });
  if (command === "import") return importUsers({ dryRun: false });
  if (command === "verify-import") return verifyImport();

  console.error(
    "Usage: node supabase/auth-migration/migrate-auth.cjs <validate-secrets|export|validate-export|inspect-supabase-auth-schema|inspect-supabase-auth-constraints|dry-run-import|import|verify-import>"
  );
  process.exit(1);
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        message: error.message || null,
        code: error.code || null,
        errno: error.errno || null,
        syscall: error.syscall || null,
        address: error.address || null,
        port: error.port || null,
      },
      null,
      2
    )
  );
  process.exit(1);
});

