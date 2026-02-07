# DAD Documentation

Welcome to the DAD (Diagram as a Delivery) documentation directory.

## Documentation Structure

### [setup/](./setup/)
Complete setup guides for all components of the DAD monorepo:
- **[SETUP.md](./setup/SETUP.md)** - Comprehensive setup guide for the entire system
- **[R2_SETUP.md](./setup/R2_SETUP.md)** - Cloudflare R2 storage configuration
- **[CACHING.md](./setup/CACHING.md)** - KV cache layer setup and configuration
- **[MONITORING.md](./setup/MONITORING.md)** - Monitoring and metrics setup

### [architecture/](./architecture/)
System architecture and design documentation:
- **[DIAGRAM_STORAGE_ARCHITECTURE.md](./architecture/DIAGRAM_STORAGE_ARCHITECTURE.md)** - Diagram storage design
- **[BATCH_PROCESSING.md](./BATCH_PROCESSING.md)** - Batch processing architecture
- **[PREVIEW_API_SPEC.md](./architecture/PREVIEW_API_SPEC.md)** - Preview API specification
- **[SVG_RENDERING_IMPLEMENTATION.md](./architecture/SVG_RENDERING_IMPLEMENTATION.md)** - SVG export system
- **[MONITORING_IMPLEMENTATION.md](./architecture/MONITORING_IMPLEMENTATION.md)** - Metrics and alerting
- **[CACHING_INTEGRATION.md](./architecture/CACHING_INTEGRATION.md)** - KV cache layer
- **[CLEANUP_WORKER_IMPLEMENTATION.md](./architecture/CLEANUP_WORKER_IMPLEMENTATION.md)** - Scheduled cleanup

### [guides/](./guides/)
Development and usage guides:
- **[INSTALLATION.md](./guides/INSTALLATION.md)** - VSCode extension installation
- **[QUICK_START.md](./guides/QUICK_START.md)** - Get up and running quickly
- **[DEPLOYMENT_CHECKLIST.md](./guides/DEPLOYMENT_CHECKLIST.md)** - Production deployment guide
- **[TESTING.md](./guides/TESTING.md)** - Testing strategies and examples
- **[EDITING_GUIDE.md](./guides/EDITING_GUIDE.md)** - Editor configuration guide

### [archive/](./archive/)
Historical implementation notes and merge summaries (for reference):
- Archived planning and migration documents
- Merge resolution notes
- Historical feature implementation details

## Quick Links

### Getting Started
1. [Complete Setup Guide](./setup/SETUP.md) - Start here for full system setup
2. [Installation Guide](./guides/INSTALLATION.md) - Quick VSCode extension install
3. [Quick Start](./guides/QUICK_START.md) - Common commands and workflows

### For Developers
- [Architecture Overview](./architecture/)
- [Testing Guide](./guides/TESTING.md)
- [Editing Guide](./guides/EDITING_GUIDE.md)

### For DevOps
- [Deployment Checklist](./guides/DEPLOYMENT_CHECKLIST.md)
- [R2 Setup](./setup/R2_SETUP.md)
- [Monitoring Setup](./setup/MONITORING.md)

## Need Help?

- Check the relevant guide in this directory
- Review package-specific READMEs in `apps/` directories
- Open an issue on GitHub
- See [Main README](../README.md) for project overview
