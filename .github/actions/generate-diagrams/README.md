# DAD Generate Diagrams Action

A reusable GitHub Action for automatically generating code diagrams using the DAD (Diagram as a Delivery) CLI.

## Features

- **Incremental or Full Generation**: Process only changed files or regenerate all diagrams
- **Smart Change Detection**: Automatically detects which files changed
- **Auto-commit**: Optionally commits generated diagrams back to the repository
- **Multiple API Providers**: Supports OpenRouter and Claude API
- **Configurable**: Extensive customization options
- **Fast**: Caches Go dependencies for quick builds
- **Detailed Reporting**: Generates workflow summaries with statistics

## Usage

### Basic Usage (Incremental)

```yaml
- name: Generate diagrams for changed files
  uses: ./.github/actions/generate-diagrams
  with:
    openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
    mode: incremental
```

### Full Regeneration

```yaml
- name: Regenerate all diagrams
  uses: ./.github/actions/generate-diagrams
  with:
    openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
    mode: full
```

### Advanced Usage

```yaml
- name: Generate diagrams with custom settings
  uses: ./.github/actions/generate-diagrams
  with:
    mode: incremental
    openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
    working-directory: ./my-project
    output-directory: .diagrams
    commit-changes: true
    commit-message: 'chore: update diagrams for {files} files [skip ci]'
    base-ref: origin/main
    file-patterns: '**/*.{ts,tsx,go}'
```

### Complete Workflow Example

```yaml
name: Generate Diagrams

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  diagrams:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Need full history for change detection

      - name: Generate diagrams
        uses: ./.github/actions/generate-diagrams
        with:
          mode: incremental
          openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
          commit-changes: true

      - name: Upload diagrams as artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: diagrams
          path: .dad/
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `mode` | Generation mode: `incremental` or `full` | No | `incremental` |
| `openrouter-api-key` | OpenRouter API key | No | - |
| `claude-api-key` | Claude API key (alternative to OpenRouter) | No | - |
| `cli-version` | DAD CLI version (`local` or version number) | No | `local` |
| `go-version` | Go version for building CLI | No | `1.21` |
| `working-directory` | Working directory for the action | No | `.` |
| `output-directory` | Directory for generated diagrams | No | `.dad` |
| `file-patterns` | File patterns to include (glob) | No | `**/*.{ts,js,tsx,jsx,go,py,java,rb,rs}` |
| `commit-changes` | Whether to commit generated diagrams | No | `true` |
| `commit-message` | Custom commit message | No | `docs: update diagrams [skip ci]` |
| `git-user-name` | Git user name for commits | No | `github-actions[bot]` |
| `git-user-email` | Git user email for commits | No | `github-actions[bot]@users.noreply.github.com` |
| `base-ref` | Base git ref for incremental comparison | No | `HEAD~1` |

### Input Details

#### `mode`
- **`incremental`**: Only processes files changed since `base-ref`
- **`full`**: Regenerates all diagrams in the repository

#### `openrouter-api-key` / `claude-api-key`
At least one API key should be provided. If neither is set, the action will show a warning.

#### `commit-message`
Supports placeholders:
- `{files}`: Number of files changed
- `{sha}`: Current commit SHA

Example: `'docs: update diagrams for {files} files from {sha} [skip ci]'`

#### `base-ref`
Used in incremental mode to determine which files changed.
- `HEAD~1`: Compare with previous commit (default)
- `origin/main`: Compare with main branch
- `abc123`: Compare with specific commit

## Outputs

| Output | Description |
|--------|-------------|
| `diagrams-generated` | Number of diagram files generated/changed |
| `files-changed` | Number of source files processed |
| `changes-committed` | Whether changes were committed (`true`/`false`) |
| `commit-sha` | SHA of the commit (if changes were committed) |

### Using Outputs

```yaml
- name: Generate diagrams
  id: diagrams
  uses: ./.github/actions/generate-diagrams
  with:
    openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}

- name: Comment on PR
  if: github.event_name == 'pull_request'
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        body: `📊 Generated ${{ steps.diagrams.outputs.diagrams-generated }} diagrams from ${{ steps.diagrams.outputs.files-changed }} files`
      })
```

## Configuration

### Setting up API Keys

#### GitHub Repository Secrets

1. Navigate to: **Repository → Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Add secrets:
   - Name: `OPENROUTER_API_KEY`
   - Value: Your API key from https://openrouter.ai/

Or via GitHub CLI:
```bash
gh secret set OPENROUTER_API_KEY
gh secret set CLAUDE_API_KEY
```

#### GitHub Environment Secrets

For environment-specific keys:

```yaml
jobs:
  diagrams:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: ./.github/actions/generate-diagrams
        with:
          openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
```

## Workflow Patterns

### On Push to Main (Auto-commit)

```yaml
name: Auto-generate Diagrams

on:
  push:
    branches: [main]

jobs:
  diagrams:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/generate-diagrams
        with:
          openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
          commit-changes: true
```

### On Pull Request (No Commit)

```yaml
name: Preview Diagrams

on:
  pull_request:
    branches: [main]

jobs:
  diagrams:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/generate-diagrams
        with:
          openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
          commit-changes: false

      - uses: actions/upload-artifact@v4
        with:
          name: preview-diagrams
          path: .dad/
```

### Manual Trigger with Options

```yaml
name: Generate Diagrams

on:
  workflow_dispatch:
    inputs:
      mode:
        description: 'Generation mode'
        required: true
        type: choice
        options:
          - incremental
          - full
        default: incremental

jobs:
  diagrams:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/generate-diagrams
        with:
          mode: ${{ inputs.mode }}
          openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
```

### Monorepo - Multiple Projects

```yaml
jobs:
  diagrams:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        project: [frontend, backend, shared]
    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/generate-diagrams
        with:
          working-directory: packages/${{ matrix.project }}
          output-directory: .dad
          openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
```

### Scheduled Full Regeneration

```yaml
name: Weekly Diagram Refresh

on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday at midnight

jobs:
  diagrams:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/generate-diagrams
        with:
          mode: full
          openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
```

## Troubleshooting

### No diagrams generated

**Issue**: Action runs but no diagrams are created.

**Solutions**:
- Check that code files actually changed (for incremental mode)
- Verify API keys are set correctly
- Check workflow logs for error messages
- Try `mode: full` to regenerate everything

### API key errors

**Issue**: Authentication failures or API errors.

**Solutions**:
```yaml
# Verify secrets are set
- name: Debug
  run: |
    if [ -z "${{ secrets.OPENROUTER_API_KEY }}" ]; then
      echo "❌ OPENROUTER_API_KEY not set"
    else
      echo "✓ OPENROUTER_API_KEY is set"
    fi
```

### Commit push failures

**Issue**: Action can't push commits.

**Solutions**:
1. Ensure `contents: write` permission:
   ```yaml
   permissions:
     contents: write
   ```

2. Check branch protection rules
3. Use PAT for protected branches:
   ```yaml
   - uses: actions/checkout@v4
     with:
       token: ${{ secrets.PAT_TOKEN }}
   ```

### Infinite loop

**Issue**: Action triggers itself repeatedly.

**Solutions**:
- Ensure commit message includes `[skip ci]`
- Add path filters:
  ```yaml
  on:
    push:
      paths-ignore:
        - '.dad/**'
  ```

### Build failures

**Issue**: Go build fails.

**Solutions**:
```yaml
- uses: ./.github/actions/generate-diagrams
  with:
    go-version: '1.21'  # Specify exact version
```

### Large repository timeout

**Issue**: Action times out on large repos.

**Solutions**:
```yaml
jobs:
  diagrams:
    timeout-minutes: 30  # Increase timeout
    steps:
      - uses: ./.github/actions/generate-diagrams
        with:
          mode: incremental  # Use incremental mode
```

## Development

### Testing Locally

```bash
# Build the CLI
cd apps/cli
make build

# Test the action locally with act
act -j diagrams --secret OPENROUTER_API_KEY=your-key
```

### Debugging

Enable debug logging:
```yaml
- uses: ./.github/actions/generate-diagrams
  with:
    openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
  env:
    ACTIONS_STEP_DEBUG: true
```

## Migration from Workflow to Action

If you're migrating from the old workflow:

**Before** (`.github/workflows/generate-diagrams.yml`):
```yaml
jobs:
  generate:
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Go
        uses: actions/setup-go@v5
      # ... many more steps
```

**After**:
```yaml
jobs:
  generate:
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/generate-diagrams
        with:
          openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
```

## Extracting to Separate Repository

When ready to publish as a standalone action:

1. Create new repository: `velvee-ai/dad-action`
2. Copy `.github/actions/generate-diagrams/*` to root
3. Update references from local to published:
   ```yaml
   uses: velvee-ai/dad-action@v1
   ```
4. Add versioning tags: `v1.0.0`, `v1`, `latest`
5. Publish to GitHub Marketplace

## License

ISC

## Support

- Issues: https://github.com/velvee-ai/dad/issues
- Documentation: https://github.com/velvee-ai/dad
