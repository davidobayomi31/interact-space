// ── Vercel serverless entry point ────────────────────────────────────
// Vercel invokes a default-exported (req, res) handler per request, and an
// Express app is exactly that function. Everything under /api/* is routed
// here by vercel.json; the built frontend is served straight from the CDN.
import app from '../server/index.js'

export default app
