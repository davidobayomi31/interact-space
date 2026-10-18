// ── One-time database move between Supabase projects ─────────────────
// Copies everything the app stores (the `public` schema: users, posts,
// communities, messages…) from the old project to the new one, then
// compares row counts table by table.
//
//   node scripts/migrate-db.mjs           copy into an empty new database
//   node scripts/migrate-db.mjs --fresh   first drop the app's tables in the
//                                         NEW database (to re-copy just before
//                                         switching the live site over)
//
// Connection details come from .env.migrate (git-ignored). Passwords are
// handed to pg_dump/psql through PGPASSWORD and never printed.
// Supabase's own schemas (auth, storage…) are left alone: the app doesn't
// use them yet, and the new project manages its own.
import { readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'

const FRESH = process.argv.includes('--fresh')

function readEnv(file) {
  const out = {}
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const i = line.indexOf('=')
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).replace(/\r$/, '')
  }
  return out
}

const env = readEnv(new URL('../.env.migrate', import.meta.url))
const side = (p) => ({
  name: p === 'OLD' ? 'old (Canada)' : 'new (Ireland)',
  host: env[`${p}_DB_HOST`], user: env[`${p}_DB_USER`], password: env[`${p}_DB_PASSWORD`],
})
const OLD = side('OLD')
const NEW = side('NEW')
for (const db of [OLD, NEW]) {
  if (!db.host || !db.user) throw new Error(`.env.migrate is missing the ${db.name} host or user.`)
  if (!db.password) throw new Error(`Fill in the ${db.name} database password in .env.migrate first.`)
}

const pgEnv = (db) => ({ ...process.env, PGPASSWORD: db.password, PGHOST: db.host, PGPORT: '5432', PGUSER: db.user, PGDATABASE: 'postgres', PGSSLMODE: 'require' })

function run(cmd, args, db, { input, pipeTo } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { env: pgEnv(db) })
    let out = '', errOut = ''
    p.stdout.on('data', (d) => { out += d })
    p.stderr.on('data', (d) => { errOut += d })
    p.on('error', reject)
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} (${db.name}) failed:\n${errOut.trim()}`))))
    if (pipeTo) pipeTo(p)
    if (input != null) { p.stdin.write(input); p.stdin.end() }
  })
}
const sql = (db, query) => run('psql', ['-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', query], db)

async function tableCounts(db) {
  const tables = (await sql(db, "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1")).split('\n').filter(Boolean)
  const counts = {}
  for (const t of tables) counts[t] = Number((await sql(db, `SELECT count(*) FROM public."${t}"`)).trim())
  return counts
}

console.log('Checking both databases…')
for (const db of [OLD, NEW]) {
  const v = (await sql(db, 'SHOW server_version')).trim()
  console.log(`  ✓ ${db.name}: connected (Postgres ${v})`)
}

const before = await tableCounts(OLD)
console.log(`\nOld database: ${Object.keys(before).length} tables, ${Object.values(before).reduce((a, b) => a + b, 0)} rows.`)

const existing = await tableCounts(NEW)
if (Object.keys(existing).length) {
  if (!FRESH) {
    console.error(`\nThe new database already has ${Object.keys(existing).length} tables in it. Nothing was copied.`)
    console.error('Run with --fresh to replace them (this only touches the NEW database).')
    process.exit(1)
  }
  console.log(`\n--fresh: dropping ${Object.keys(existing).length} app tables in the NEW database…`)
  const drops = Object.keys(existing).map((t) => `DROP TABLE IF EXISTS public."${t}" CASCADE;`).join('\n')
  await run('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '--single-transaction'], NEW, { input: drops })
}

console.log('\nCopying… (one transaction: if anything fails, nothing is left half-copied)')
// Tables only (with their indexes and constraints): the public schema also
// holds Supabase's own rls_auto_enable() helper, which the new project has.
const dump = await run('pg_dump', ['--table=public.*', '--no-owner', '--no-privileges', '--no-comments', '--no-publications', '--no-subscriptions'], OLD)
// The public schema already exists in every Supabase project.
const script = dump.replace(/^CREATE SCHEMA public;$/m, '')
await run('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '--single-transaction'], NEW, { input: script })

const after = await tableCounts(NEW)
console.log('\nTable                      old      new')
let ok = true
for (const t of Object.keys(before)) {
  const same = before[t] === after[t]
  if (!same) ok = false
  console.log(`${same ? '✓' : '✗'} ${t.padEnd(24)} ${String(before[t]).padStart(6)} ${String(after[t] ?? '—').padStart(8)}`)
}
console.log(ok ? '\nEverything copied and the counts match.' : '\nSome counts differ — do not switch the live site yet.')
process.exit(ok ? 0 : 1)
