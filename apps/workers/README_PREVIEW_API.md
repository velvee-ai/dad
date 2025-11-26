# Preview API Documentation

The Preview API provides endpoints for creating and retrieving diagram previews from code changes.

## Endpoints

### POST /api/preview/analyze

Creates a preview session by analyzing code changes and generating diagrams.

**Request Body:**

```json
{
  "changes": [
    {
      "fileId": "unique-file-id",
      "filename": "example.ts",
      "code": "function example() { ... }",
      "language": "typescript"
    }
  ],
  "options": {
    "includeComments": true,
    "maxDepth": 3,
    "includeTests": false
  }
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "sha": "abc123def456",
  "diagrams": [
    {
      "fileId": "unique-file-id",
      "filename": "example.ts",
      "diagram": {
        "nodes": [...],
        "edges": [...],
        "metadata": {...}
      },
      "url": "/api/preview/abc123def456/unique-file-id"
    }
  ],
  "manifest": {
    "sha": "abc123def456",
    "timestamp": 1234567890,
    "diagrams": [
      {
        "fileId": "unique-file-id",
        "filename": "example.ts",
        "language": "typescript",
        "formats": ["json", "d2", "mermaid"]
      }
    ]
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid request body or missing required fields
- `500 Internal Server Error` - Server error during processing

### GET /api/preview/:sha/:fileId

Retrieves a specific diagram from a preview session.

**Path Parameters:**

- `sha` - Session hash from the analyze response
- `fileId` - File identifier from the analyze request

**Query Parameters:**

- `format` - Output format: `json` (default), `d2`, or `mermaid`

**Examples:**

```
GET /api/preview/abc123def456/unique-file-id
GET /api/preview/abc123def456/unique-file-id?format=json
GET /api/preview/abc123def456/unique-file-id?format=d2
GET /api/preview/abc123def456/unique-file-id?format=mermaid
```

**Response (200 OK):**

Content type depends on format:
- `json`: `application/json`
- `d2`, `mermaid`: `text/plain`

**Error Responses:**

- `400 Bad Request` - Invalid format or missing parameters
- `404 Not Found` - Diagram not found for the given sha/fileId
- `503 Service Unavailable` - R2 storage not configured

### GET /api/preview/:sha/manifest

Retrieves the manifest for a preview session, listing all available diagrams.

**Path Parameters:**

- `sha` - Session hash from the analyze response

**Example:**

```
GET /api/preview/abc123def456/manifest
```

**Response (200 OK):**

```json
{
  "sha": "abc123def456",
  "timestamp": 1234567890,
  "diagrams": [
    {
      "fileId": "unique-file-id",
      "filename": "example.ts",
      "language": "typescript",
      "formats": ["json", "d2", "mermaid"]
    }
  ]
}
```

**Error Responses:**

- `400 Bad Request` - Missing sha parameter
- `404 Not Found` - Manifest not found for the given sha
- `503 Service Unavailable` - R2 storage not configured

## CORS Configuration

All endpoints include CORS headers to allow IDE extension access:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## Storage

Diagrams are stored in Cloudflare R2 with the following structure:

```
{sha}/
  ├── manifest.json
  ├── {fileId}.json
  ├── {fileId}.d2
  └── {fileId}.mermaid
```

## Configuration

The Preview API requires R2 bucket configuration in `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "PREVIEW_BUCKET"
bucket_name = "daad-previews"
preview_bucket_name = "daad-previews-dev"
```

## Development

To test the endpoints locally:

```bash
# Start the development server
pnpm --filter @daad/workers dev

# Create a preview session
curl -X POST http://localhost:8787/api/preview/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "changes": [{
      "fileId": "test-1",
      "filename": "test.ts",
      "code": "function test() {}",
      "language": "typescript"
    }]
  }'

# Get a diagram
curl http://localhost:8787/api/preview/{sha}/test-1?format=json

# Get the manifest
curl http://localhost:8787/api/preview/{sha}/manifest
```

## Implementation Notes

1. **Session SHA Generation**: Uses Web Crypto API (SHA-256) for generating session identifiers
2. **Mock Diagrams**: Currently returns mock diagrams; will be replaced with AI-powered analysis
3. **Format Conversion**: Supports JSON, D2, and Mermaid diagram formats
4. **Error Handling**: Comprehensive validation and error responses
5. **R2 Integration**: Stores all diagrams and manifests in R2 for retrieval
