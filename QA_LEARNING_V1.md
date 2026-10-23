# QA Learning V1 delivery notes

## Baseline and rollback

- Upstream default branch: `main`
- Upstream rollback SHA: `644cdbee1511208469b0bb80a99aed8495489b75`
- Development branch: `feature/qa-learning-v1`
- No production deployment or D1 write was performed.

To roll code back after a future merge, revert the QA feature commit rather than resetting user data. A Git rollback does not restore D1 learning records.

## Data safety and recovery

The browser backup schema is now `tradetalk.v2` with `schemaVersion: 3`; imports still accept `tradetalk.v1`. Existing `tradeTalkV1`, legacy phrase progress, saved phrases, reviews, and daily plans remain readable. New question sets use `qaDailyPlans` so legacy `dailyPlans` are not rewritten.

Before any production release:

1. Export a browser JSON backup from every important device.
2. Back up the Cloudflare D1 `sync_data` table using the Cloudflare dashboard or Wrangler after explicit owner approval.
3. Record the D1 backup identifier and test restoring it to a non-production database.
4. Test two-device convergence with copies of real-shaped data before changing the production binding.

The client now merges `dailyPlans`, `qaDailyPlans`, `itemProgress`, reviews, saved items, and custom question units by item instead of replacing whole maps. D1 remains a payload store and is not changed by this branch.

## Deployment impact

The build remains a VitePress/Cloudflare Pages build. `_worker.js` and `database/schema.sql` require no schema migration. `SYNC_DB` must remain bound for sync. The repository does not contain enough provider metadata to prove which Cloudflare Pages project or production branch is connected; confirm those settings in Cloudflare before merging.

The service-worker cache is bumped to `tradetalk-vitepress-v2.2.0-qa2`, and the Vue shell asset version is bumped to the same release identifier so phones do not keep the prior shell or JavaScript.

## Verification

- `pnpm test:qa`
- `pnpm build`
- Browser: five fixed units render, reveal/answer flow works, rating survives refresh, and product/chapter association renders.
- Second-pass fixes: the completion report uses the five QA units as its primary count; due QA units appear in the shared review list; the sample dialogue is limited to its linked scenario chapter; equal-time sync rating conflicts are recorded and resolved to the weaker result.
- Microphone recording needs an actual-device permission test before release.
- Production D1 backup/restore and true two-device conflict testing remain blocked until the owner explicitly approves access to real data.
