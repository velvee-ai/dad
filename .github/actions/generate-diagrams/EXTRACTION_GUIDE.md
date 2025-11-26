# Extracting to Standalone Repository

This guide explains how to extract the DAAD Generate Diagrams action into a standalone repository for broader distribution and GitHub Marketplace publication.

## Why Extract?

**Keep in monorepo if:**
- Action is tightly coupled with CLI development
- Changes to CLI require action updates
- Only used internally
- Want to test changes together

**Extract to separate repo if:**
- Want to publish to GitHub Marketplace
- External teams want to use it
- Need independent versioning
- Want to enable external contributions
- CLI is stable and API is finalized

## Extraction Steps

### 1. Create New Repository

```bash
# Create new repository on GitHub
gh repo create velvee-ai/daad-action --public --description "GitHub Action for DAAD diagram generation"

# Clone it
git clone git@github.com:velvee-ai/daad-action.git
cd daad-action
```

### 2. Copy Action Files

```bash
# From the monorepo, copy action files to new repo root
cp -r .github/actions/generate-diagrams/* /path/to/daad-action/

# The structure should be:
# daad-action/
# ├── action.yml
# ├── README.md
# └── EXTRACTION_GUIDE.md (this file)
```

### 3. Update action.yml

Since the action will no longer be in the DAAD monorepo, update paths:

**Change:**
```yaml
- name: Install DAAD CLI
  working-directory: ${{ inputs.working-directory }}
  run: |
    if [[ "${{ inputs.cli-version }}" == "local" ]]; then
      echo "Building local DAAD CLI..."
      cd apps/cli
      make build
      CLI_PATH="$(pwd)/bin/daad"
```

**To:**
```yaml
- name: Install DAAD CLI
  working-directory: ${{ inputs.working-directory }}
  run: |
    if [[ "${{ inputs.cli-version }}" == "local" ]]; then
      echo "::error::Local CLI build not supported in standalone action"
      echo "Please specify a version with cli-version input"
      exit 1
    fi
```

Add version installation logic:
```yaml
    # Download from releases
    VERSION="${{ inputs.cli-version }}"
    echo "Downloading DAAD CLI version $VERSION..."

    # Detect OS and architecture
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then ARCH="amd64"; fi

    # Download binary
    DOWNLOAD_URL="https://github.com/velvee-ai/daad/releases/download/cli-${VERSION}/daad-${OS}-${ARCH}"
    curl -fsSL "$DOWNLOAD_URL" -o /tmp/daad
    chmod +x /tmp/daad
    sudo mv /tmp/daad /usr/local/bin/daad
```

### 4. Update README.md

Change usage examples from local path to published action:

**Change:**
```yaml
uses: ./.github/actions/generate-diagrams
```

**To:**
```yaml
uses: velvee-ai/daad-action@v1
```

### 5. Add GitHub Metadata

Create `.github/workflows/test.yml` in the action repo:

```yaml
name: Test Action

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Test action
        uses: ./
        with:
          mode: incremental
          cli-version: '0.1.0'
          openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
```

### 6. Version and Release

```bash
# Commit and push
git add .
git commit -m "Initial release of DAAD action"
git push origin main

# Create initial version tags
git tag -a v1.0.0 -m "Release v1.0.0"
git tag -a v1 -m "Release v1 (tracks latest v1.x.x)"
git push origin v1.0.0
git push origin v1
```

### 7. Publish to Marketplace

1. Go to repository on GitHub
2. Click **Releases** → **Draft a new release**
3. Select tag `v1.0.0`
4. Release title: `v1.0.0 - Initial Release`
5. Check **Publish this Action to the GitHub Marketplace**
6. Select primary category: **Continuous Integration**
7. Add secondary category: **Code Quality**
8. Click **Publish release**

### 8. Update Monorepo

Update the monorepo workflow to use the published action:

```yaml
# .github/workflows/generate-diagrams.yml
- name: Generate diagrams
  uses: velvee-ai/daad-action@v1
  with:
    mode: incremental
    cli-version: '0.1.0'  # Must specify version now
    openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
```

Remove the local action:
```bash
rm -rf .github/actions/generate-diagrams
```

## Versioning Strategy

### Semantic Versioning

- `v1.0.0` - Breaking changes, new major features
- `v1.1.0` - New features, backwards compatible
- `v1.1.1` - Bug fixes

### Git Tags

Maintain floating major version tags:

```bash
# After releasing v1.2.0
git tag -fa v1 -m "Update v1 to v1.2.0"
git push origin v1 --force
```

This allows users to:
- Pin to specific version: `uses: velvee-ai/daad-action@v1.2.0`
- Track major version: `uses: velvee-ai/daad-action@v1`
- Use latest: `uses: velvee-ai/daad-action@main` (not recommended)

## Maintenance

### Syncing Updates

To sync action updates back to the monorepo during development:

```bash
# In monorepo
cd .github/actions/generate-diagrams

# Pull changes from standalone repo
git remote add action-repo git@github.com:velvee-ai/daad-action.git
git fetch action-repo
git checkout action-repo/main -- action.yml README.md

# Revert any paths that need to reference monorepo structure
# (like working-directory: apps/cli)
```

### Release Checklist

When releasing a new version:

- [ ] Update CHANGELOG.md
- [ ] Update version in documentation
- [ ] Test with multiple workflows
- [ ] Create and push version tag
- [ ] Create GitHub release
- [ ] Update marketplace listing if needed
- [ ] Announce in discussions/community

## Testing Before Publication

Test the action locally before publishing:

```bash
# Use act to test locally
act -j test-action --secret OPENROUTER_API_KEY=your-key

# Or test in a separate test repository
# Create test repo, add action as submodule, test workflow
```

## Example Standalone Repository Structure

```
daad-action/
├── .github/
│   └── workflows/
│       ├── test.yml
│       └── release.yml
├── action.yml
├── README.md
├── CHANGELOG.md
├── LICENSE
└── examples/
    ├── basic.yml
    ├── monorepo.yml
    └── advanced.yml
```

## External Usage Examples

After publication, users can consume the action:

### Basic Usage
```yaml
- uses: velvee-ai/daad-action@v1
  with:
    openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
```

### With Version Pinning
```yaml
- uses: velvee-ai/daad-action@v1.2.0
  with:
    mode: full
    cli-version: '0.1.0'
    openrouter-api-key: ${{ secrets.OPENROUTER_API_KEY }}
```

## Support and Community

After extraction:
- **Issues**: `velvee-ai/daad-action/issues`
- **Discussions**: `velvee-ai/daad-action/discussions`
- **Docs**: `velvee-ai/daad-action/README.md`
- **CLI Issues**: `velvee-ai/daad/issues` (separate)

## Benefits of Extraction

1. **Discoverability**: Listed on GitHub Marketplace
2. **Versioning**: Independent release cycle
3. **Stats**: Track action usage across GitHub
4. **Community**: External contributions easier
5. **Documentation**: Focused, single-purpose docs
6. **Testing**: Dedicated CI/CD for the action
7. **Badges**: Action-specific badges and metrics

---

**Ready to extract?** Follow the steps above and publish to GitHub Marketplace to make DAAD diagram generation available to the entire GitHub community!
