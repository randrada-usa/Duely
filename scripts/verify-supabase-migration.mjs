import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPath = resolve(
  'supabase/migrations/20260825104755_initial_duely_schema.sql',
);
const sql = readFileSync(migrationPath, 'utf8').toLowerCase();
const tables = [
  'profiles',
  'subjects',
  'tasks',
  'reminders',
  'consent_events',
  'ai_allowances',
];
const clientWritableTables = ['profiles', 'subjects', 'tasks', 'reminders'];

function assert(condition, message) {
  if (!condition) throw new Error(`Supabase migration check failed: ${message}`);
}

for (const table of tables) {
  assert(sql.includes(`create table public.${table}`), `missing ${table} table`);
  assert(
    sql.includes(`alter table public.${table} enable row level security`),
    `RLS is not enabled on ${table}`,
  );
  assert(
    sql.includes(`alter table public.${table} force row level security`),
    `RLS is not forced on ${table}`,
  );
  assert(
    sql.includes(`revoke all on table public.${table} from public, anon, authenticated`),
    `explicit role revocation is missing on ${table}`,
  );
  assert(
    sql.includes(`grant all on table public.${table} to service_role`),
    `server-role privileges are missing on ${table}`,
  );
}

for (const table of clientWritableTables) {
  const updatePolicy = new RegExp(
    `create policy ${table}_update_own[\\s\\S]*?for update to authenticated[\\s\\S]*?using \\(\\(select auth\\.uid\\(\\)\\) = user_id\\)[\\s\\S]*?with check \\(\\(select auth\\.uid\\(\\)\\) = user_id\\);`,
  );
  assert(updatePolicy.test(sql), `${table} update policy needs USING and WITH CHECK`);
}

assert(
  sql.includes('foreign key (subject_id, user_id)') &&
    sql.includes('references public.subjects (id, user_id)'),
  'task-to-subject ownership constraint is missing',
);
assert(
  sql.includes('foreign key (task_id, user_id)') &&
    sql.includes('references public.tasks (id, user_id)'),
  'reminder-to-task ownership constraint is missing',
);
assert(sql.includes('grant select on table public.consent_events to authenticated'),
  'authenticated clients must be able to read their consent history');
assert(
  sql.includes('grant insert (user_id, consent_type, consent_version, decision)') &&
    sql.includes('on table public.consent_events to authenticated'),
  'consent events must be append-only with server-generated audit fields',
);
assert(
  sql.includes('grant select on table public.ai_allowances to authenticated'),
  'AI allowances must be read-only for authenticated clients',
);
assert(!sql.includes('grant all on table public.ai_allowances to authenticated'),
  'authenticated clients must not control AI allowances');
assert(!sql.includes('sb_secret_') && !sql.includes('service_role_key'),
  'a secret-like credential was found in the migration');
assert(!sql.includes('grant select, insert, update, delete on table public.'),
  'broad authenticated grants would expose protected audit or ownership columns');

console.log(`Verified secure migration structure for ${tables.length} tables.`);
