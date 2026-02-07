# Preview API Specification

## Overview

The Preview API endpoint allows visualization of uncommitted changes from the VSCode extension.

## Endpoint

```
POST /api/preview
```

## Request Body

```typescript
{
  code: string;           // Combined code snippets from changed regions
  commitSha: string;      // Temp commit SHA (e.g., "temp-a1b2c3d")
  branch: string;         // Current git branch name
  baseSha: string;        // Base commit SHA (current HEAD)
  type: 'uncommitted';    // Type of preview
}
```

### Example Request

```json
{
  "code": "// ===== GIT CHANGES SUMMARY =====\n// Total Files Changed: 2\n// Total Additions: +15\n// Total Deletions: -3\n// Status: Unstaged changes\n// Temp Commit SHA: temp-a1b2c3d\n// ================================\n\n// ===== CHANGE 1: src/utils/helper.ts =====\n// src/utils/helper.ts (lines 10-25)\nexport function processData(input: string): string {\n  // New implementation\n  return input.trim().toUpperCase();\n}\n\n// ===== END CHANGE =====\n\n// ===== CHANGE 2: src/index.ts =====\n// src/index.ts (lines 5-15)\nimport { processData } from './utils/helper';\n\nconst result = processData('hello world');\nconsole.log(result);\n\n// ===== END CHANGE =====",
  "commitSha": "temp-a1b2c3d",
  "branch": "feature/new-processing",
  "baseSha": "d4e5f6g7h8i9j0k",
  "type": "uncommitted"
}
```

## Response

### Success Response

```typescript
{
  success: true;
  diagram: FlowChartData;  // Standard DAD flow chart data structure
  metadata: {
    commitSha: string;
    branch: string;
    baseSha: string;
    timestamp: string;
    filesChanged: number;
  };
}
```

### Example Success Response

```json
{
  "success": true,
  "diagram": {
    "nodes": [
      {
        "id": "1",
        "type": "start",
        "data": { "label": "Start" },
        "position": { "x": 0, "y": 0 }
      },
      {
        "id": "2",
        "type": "function",
        "data": { "label": "processData" },
        "position": { "x": 100, "y": 100 }
      }
    ],
    "edges": [
      {
        "id": "e1-2",
        "source": "1",
        "target": "2"
      }
    ]
  },
  "metadata": {
    "commitSha": "temp-a1b2c3d",
    "branch": "feature/new-processing",
    "baseSha": "d4e5f6g7h8i9j0k",
    "timestamp": "2025-11-26T08:00:00.000Z",
    "filesChanged": 2
  }
}
```

### Error Response

```typescript
{
  success: false;
  error: string;
  message: string;
}
```

### Example Error Response

```json
{
  "success": false,
  "error": "ANALYSIS_FAILED",
  "message": "Failed to analyze code: Invalid syntax"
}
```

## Implementation Notes

### Handler Implementation

The preview handler should:

1. Validate the request body
2. Extract code snippets from the combined code
3. Call the AI analysis service
4. Generate flow chart data
5. Return the diagram with metadata

### Example Handler (TypeScript)

```typescript
import { Context } from 'hono';
import { analyzeCode } from '../services/analyzer';

export async function previewHandler(c: Context) {
  try {
    const { code, commitSha, branch, baseSha, type } = await c.req.json();

    // Validate required fields
    if (!code || !commitSha || !branch || !baseSha) {
      return c.json(
        {
          success: false,
          error: 'INVALID_REQUEST',
          message: 'Missing required fields',
        },
        400
      );
    }

    // Analyze the code and generate diagram
    const diagram = await analyzeCode(code);

    // Return success response
    return c.json({
      success: true,
      diagram,
      metadata: {
        commitSha,
        branch,
        baseSha,
        timestamp: new Date().toISOString(),
        filesChanged: countFilesInCode(code),
      },
    });
  } catch (error) {
    console.error('Preview API error:', error);
    return c.json(
      {
        success: false,
        error: 'ANALYSIS_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

function countFilesInCode(code: string): number {
  const matches = code.match(/\/\/ ===== CHANGE \d+: (.+?) =====/g);
  return matches ? matches.length : 0;
}
```

## Security Considerations

1. **Rate Limiting**: Implement rate limiting to prevent abuse
2. **Authentication**: Add API key authentication for production use
3. **Input Validation**: Validate and sanitize all inputs
4. **Code Size Limits**: Limit the maximum size of code input (e.g., 1MB)
5. **Timeout**: Set reasonable timeout for AI analysis (e.g., 30 seconds)

## CORS Configuration

The endpoint should allow CORS for VSCode extension requests:

```typescript
app.use('/api/preview', cors({
  origin: 'vscode-webview://*',
  methods: ['POST'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
```

## Testing

### Manual Testing

```bash
curl -X POST http://localhost:8787/api/preview \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function test() { return 42; }",
    "commitSha": "temp-test123",
    "branch": "main",
    "baseSha": "abc123",
    "type": "uncommitted"
  }'
```

### Integration Testing

The VSCode extension will automatically use this endpoint when configured:

1. Set `dad.workersApiUrl` in VSCode settings
2. Make changes to a file in a git repository
3. Run "DAD: Visualize Changes"
4. Verify the request/response in network logs

## Deployment

### Cloudflare Workers

```bash
# Add to wrangler.toml
[[routes]]
pattern = "*/api/preview"
zone_name = "your-domain.com"

# Deploy
pnpm deploy
```

### Environment Variables

Set these secrets for the preview API:

```bash
wrangler secret put OPENROUTER_API_KEY
wrangler secret put CLAUDE_API_KEY
```

## Monitoring

Track these metrics:

- Request count
- Success/failure rate
- Response time
- Error types
- Code size distribution

## Related Documentation

- [Visualize Changes Feature](../vscode-extension/VISUALIZE_CHANGES_FEATURE.md)
- [Workers API Documentation](./README.md)
- [VSCode Extension README](../vscode-extension/README.md)
