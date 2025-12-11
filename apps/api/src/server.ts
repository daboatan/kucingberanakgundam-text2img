/**
 * Z-Image API - Node.js Server
 *
 * Standalone Node.js server using @hono/node-server
 */

import { serve } from '@hono/node-server'
import app from './app'

const port = Number(process.env.PORT) || 8787

console.log(`Starting Z-Image API server...`)

serve({
  fetch: app.fetch,
  port,
})

console.log(`Server is running on http://localhost:${port}`)
console.log(`API endpoints:`)
console.log(`  GET  /api/         - Health check`)
console.log(`  POST /api/generate - Image generation`)
console.log(`  POST /api/upscale  - Image upscaling`)
