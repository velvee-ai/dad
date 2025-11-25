# @daad/workers

Cloudflare Workers backend API for DAAD.

## Features

- Code analysis API
- Diagram export API
- Diagram storage (R2/KV)
- CORS enabled
- TypeScript with Hono framework

## Development

### Install dependencies

```bash
pnpm install
```

### Start development server

```bash
pnpm dev
```

The server will start at `http://localhost:8787`

### Deploy to Cloudflare

```bash
pnpm deploy
```

## API Endpoints

### POST /api/analyze

Analyze code and generate flow diagram.

**Request:**
```json
{
  "code": "function example() { ... }",
  "language": "javascript",
  "options": {}
}
```

**Response:**
```json
{
  "diagram": { ... },
  "success": true
}
```

### POST /api/export

Export diagram to various formats.

**Request:**
```json
{
  "diagram": { ... },
  "format": "d2"
}
```

**Response:**
```json
{
  "content": "...",
  "format": "d2",
  "success": true
}
```

### GET /api/diagrams

List all saved diagrams.

### POST /api/diagrams

Save a diagram.

### GET /api/diagrams/:id

Get a specific diagram.

### DELETE /api/diagrams/:id

Delete a diagram.

## Environment Variables

Create `.dev.vars` file for local development:

```bash
OPENROUTER_API_KEY=your_key
CLAUDE_API_KEY=your_key
```

For production, use Wrangler secrets:

```bash
wrangler secret put OPENROUTER_API_KEY
wrangler secret put CLAUDE_API_KEY
```

## TODO

- [ ] Implement actual AI code analysis
- [ ] Set up R2 bucket for diagram storage
- [ ] Set up KV for metadata
- [ ] Add authentication
- [ ] Add rate limiting
- [ ] Add tests
