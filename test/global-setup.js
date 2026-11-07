import pg from 'pg'

// Runs once before the whole suite: start from an empty database so every
// run sees the same state (the app creates its schema and seed data on the
// first request).
export default async function ({ provide: _provide, config }) {
  const client = new pg.Client({ connectionString: config.env.DATABASE_URL })
  await client.connect()
  try {
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  } finally {
    await client.end()
  }
}
