# Deployment Checklist: Cleanup Worker

## Pre-Deployment

### 1. R2 Bucket Setup
```bash
# Create production bucket
wrangler r2 bucket create dad-diagrams

# Create preview bucket (optional)
wrangler r2 bucket create dad-diagrams-preview
```

- [ ] Production bucket created
- [ ] Preview bucket created (if needed)
- [ ] Bucket names match wrangler.toml

### 2. Configuration Review

Review `apps/workers/wrangler.toml`:
- [ ] R2 bucket binding configured
- [ ] Cron schedule is correct (default: 0 2 * * *)
- [ ] DRY_RUN set to "true" for first deployment

### 3. Code Review

- [ ] All TypeScript files compile
- [ ] No linting errors
- [ ] Documentation is complete
- [ ] Test script is executable

## Initial Deployment

### 1. Deploy with Dry-Run Mode

```bash
cd apps/workers
wrangler deploy
```

- [ ] Deployment successful
- [ ] No build errors
- [ ] Worker shows up in Cloudflare dashboard

### 2. Test Manually

```bash
# Trigger scheduled worker manually
wrangler tail  # In one terminal

# In Cloudflare dashboard:
# Workers & Pages > dad-workers > Triggers > Send Test Event
```

- [ ] Manual trigger works
- [ ] Logs show "dry run: true"
- [ ] Stats are logged correctly
- [ ] No actual deletions occur

### 3. Verify Cron Trigger

- [ ] Cron trigger appears in Cloudflare dashboard
- [ ] Schedule matches configuration
- [ ] Next run time is displayed

## Live Mode Deployment

### 1. Enable Live Mode

Update `apps/workers/wrangler.toml`:
```toml
[vars]
DRY_RUN = "false"
```

### 2. Deploy Updated Config

```bash
wrangler deploy
```

- [ ] Config updated
- [ ] Deployment successful

### 3. Monitor First Live Run

```bash
wrangler tail
```

- [ ] Wait for cron trigger or trigger manually
- [ ] Verify cleanup runs successfully
- [ ] Check stats for expected values
- [ ] Confirm no errors

## Post-Deployment

### 1. Monitoring Setup

- [ ] Review cleanup logs in Cloudflare dashboard
- [ ] Note typical execution time
- [ ] Note typical objects deleted
- [ ] Set baseline for future monitoring

### 2. Documentation

- [ ] Update team on new cleanup worker
- [ ] Document any custom configuration
- [ ] Share monitoring procedures

### 3. Schedule Review

- [ ] Mark calendar for 1-week review
- [ ] Plan to check cleanup effectiveness
- [ ] Consider adjusting TTL or schedule if needed

## Rollback Plan

If issues occur:

1. **Disable Cleanup**
   ```bash
   # Set DRY_RUN=true
   wrangler deploy
   ```

2. **Remove Cron Trigger**
   ```toml
   # Comment out in wrangler.toml
   # [triggers]
   # crons = ["0 2 * * *"]
   ```

3. **Investigate**
   - Review logs in Cloudflare dashboard
   - Check R2 bucket for issues
   - Test locally with dry-run mode

## Maintenance Schedule

### Weekly
- [ ] Review cleanup logs
- [ ] Check for any errors
- [ ] Monitor storage trends

### Monthly
- [ ] Review TTL settings
- [ ] Analyze cleanup statistics
- [ ] Optimize if needed

### Quarterly
- [ ] Review cron schedule
- [ ] Consider performance improvements
- [ ] Update documentation if changed

## Support

For issues or questions:
- Check `apps/workers/src/scheduled/README.md`
- Review Cloudflare Workers documentation
- Contact: [Your team contact]

## Version Info

- Implementation Date: 2025-01-26
- Initial Version: 1.0.0
- Cloudflare Workers Version: Compatibility date 2024-01-01
