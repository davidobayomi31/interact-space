import { describe, it, expect, vi, beforeAll } from 'vitest'

// Pretend a Claude API key is configured, and replace the SDK with a fake
// whose reply we control. This lets the test check what the server does with
// the model's answer, without calling a real model.
const fake = vi.hoisted(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key'
  return { reply: null, fail: false }
})

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: async () => {
        if (fake.fail) throw new Error('upstream outage')
        return { content: [{ type: 'text', text: JSON.stringify(fake.reply) }] }
      },
    }
  },
}))

const { app, request } = await import('./helpers.js')
const { q } = await import('../server/db.js')

describe('AI companion', () => {
  let realCommunity

  beforeAll(async () => {
    await request(app).get('/api/communities') // first request creates the schema and seed data
    realCommunity = await q.get('SELECT id FROM communities ORDER BY id LIMIT 1')
  })

  it('asks for a message when the input is empty', async () => {
    const res = await request(app).post('/api/companion').send({ message: '   ' })
    expect(res.status).toBe(400)
  })

  it('drops anything the model invents and keeps only items that exist in the database', async () => {
    fake.fail = false
    fake.reply = {
      message: 'Here you go.',
      communities: [
        { id: 'made-up-community', because: 'hallucinated' },
        { id: realCommunity.id, because: 'real' },
      ],
      people: [{ id: 'u-made-up', because: 'hallucinated' }],
      posts: [],
    }
    const res = await request(app).post('/api/companion').send({ message: 'farming' })
    expect(res.status).toBe(200)
    expect(res.body.source).toBe('llm')

    const ids = res.body.sections.flatMap((s) => s.results.map((r) => r.item.id))
    expect(ids).toEqual([realCommunity.id])
  })

  it('falls back to the rule-based engine when the model call fails', async () => {
    fake.fail = true
    const res = await request(app).post('/api/companion').send({ message: 'tech startups' })
    expect(res.status).toBe(200)
    expect(res.body.source).toBe('rules')
  })

  it('falls back when the model returns something that is not JSON', async () => {
    fake.fail = false
    fake.reply = undefined // JSON.stringify(undefined) gives no text at all
    const res = await request(app).post('/api/companion').send({ message: 'music' })
    expect(res.body.source).toBe('rules')
  })
})
