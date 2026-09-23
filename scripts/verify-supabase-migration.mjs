import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationPath = resolve(
  'supabase/migrations/20260825104755_initial_duely_schema.sql',
);
const sql = readFileSync(migrationPath, 'utf8').toLowerCase();
const clientTimestampGrantSql = readFileSync(
  resolve(
    'supabase/migrations/20260825130831_allow_client_created_at.sql',
  ),
  'utf8',
).toLowerCase();
const aiAssistSql = readFileSync(
  resolve(
    'supabase/migrations/20260829150015_ai_assist_consent_and_allowance.sql',
  ),
  'utf8',
).toLowerCase();
const consentVersionSql = readFileSync(
  resolve(
    'supabase/migrations/20260829150648_enforce_consent_versions.sql',
  ),
  'utf8',
).toLowerCase();
const aiLedgerDenialSql = readFileSync(
  resolve(
    'supabase/migrations/20260829151029_document_ai_ledger_client_denial.sql',
  ),
  'utf8',
).toLowerCase();
const verifiedPlusSql = readFileSync(
  resolve(
    'supabase/migrations/20260923145008_verified_plus_ai_allowance.sql',
  ),
  'utf8',
).toLowerCase();
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
assert(
  clientTimestampGrantSql.includes(
    'grant insert (created_at) on table public.subjects to authenticated',
  ) &&
    clientTimestampGrantSql.includes(
      'grant insert (created_at) on table public.tasks to authenticated',
    ),
  'guest backup must preserve original creation timestamps',
);
assert(
  !clientTimestampGrantSql.includes('grant update') &&
    !clientTimestampGrantSql.includes('user_id'),
  'guest backup timestamp grants must not permit ownership or timestamp rewrites',
);
assert(
  aiAssistSql.includes("consent_type in ('ai_processing', 'model_improvement')"),
  'cloud AI processing and model-improvement consent must remain separate',
);
assert(
  aiAssistSql.includes('create table public.ai_scan_requests') &&
    aiAssistSql.includes('alter table public.ai_scan_requests enable row level security') &&
    aiAssistSql.includes('alter table public.ai_scan_requests force row level security'),
  'AI request idempotency ledger must use forced RLS',
);
assert(
  aiAssistSql.includes('create function public.reserve_ai_scan') &&
    aiAssistSql.includes('allowance.used_count < allowance.allowance_limit') &&
    aiAssistSql.includes("reservation_status text"),
  'AI allowance reservation must be atomic and report a stable status',
);
assert(
  aiAssistSql.includes('create function public.release_ai_scan') &&
    aiAssistSql.includes("request.state = 'reserved'") &&
    aiAssistSql.includes('greatest(allowance.used_count - 1, 0)'),
  'failed AI requests must be refunded at most once',
);
assert(
  aiAssistSql.includes('from public, anon, authenticated') &&
    aiAssistSql.includes('to service_role') &&
    !aiAssistSql.includes('security definer'),
  'AI allowance functions must remain server-only invoker functions',
);
assert(
  consentVersionSql.includes("consent_type = 'ai_processing'") &&
    consentVersionSql.includes("consent_version = 'ai-processing-v1'") &&
    consentVersionSql.includes("consent_type = 'model_improvement'") &&
    consentVersionSql.includes("consent_version = 'model-improvement-v1'"),
  'consent events must use the reviewed version for their specific purpose',
);
assert(
  aiLedgerDenialSql.includes('create policy ai_scan_requests_deny_clients') &&
    aiLedgerDenialSql.includes('to anon, authenticated') &&
    aiLedgerDenialSql.includes('using (false)') &&
    aiLedgerDenialSql.includes('with check (false)'),
  'the AI request ledger must explicitly deny every client operation',
);
assert(
  verifiedPlusSql.includes('drop constraint ai_allowances_check1') &&
    verifiedPlusSql.includes('create function public.set_verified_ai_allowance_limit') &&
    verifiedPlusSql.includes('p_allowance_limit not in (5, 20)') &&
    verifiedPlusSql.includes('set allowance_limit = excluded.allowance_limit') &&
    !verifiedPlusSql.includes('set used_count = 0'),
  'a verified Plus downgrade must preserve historical usage',
);
assert(
  verifiedPlusSql.includes('revoke all on function public.set_verified_ai_allowance_limit') &&
    verifiedPlusSql.includes('from public, anon, authenticated') &&
    verifiedPlusSql.includes('to service_role') &&
    !verifiedPlusSql.includes('security definer'),
  'verified Plus allowance changes must remain server-only',
);

console.log(`Verified secure migration structure for ${tables.length} tables.`);
