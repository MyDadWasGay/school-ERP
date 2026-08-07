# Backup and restore procedure

The web service does not create backups during request handling. Production
databases must use the provider's encrypted, off-site backup or point-in-time
recovery policy. The repository scripts are for an offline local SQLite copy or
for a provider-exported SQLite file; they are not a substitute for Turso
retention policy.

## Targets and objectives

- Define an owner for backup verification and restore approval.
- Record the target RPO and RTO in the release record before launch.
- Keep database and private Cloudinary/document-storage retention policies
  aligned with the school's retention policy.
- Perform a restore drill at least once per release quarter and after a
  migration family that changes tenant or financial invariants.

## Local SQLite copy

Stop writers before copying a local database, then use explicit file paths:

```powershell
npm run db:backup -- --source .\school-erp.db --destination .\.backups\school-erp-2026-08-07.db
```

Verify the backup file and apply migrations to a disposable copy before using
it for recovery evidence. Never pass a production database path copied from an
environment variable without reviewing the resolved path.

## Restore drill

The restore command requires an explicit confirmation flag and preserves the
old target beside the restored file:

```powershell
npm run db:restore -- --source .\.backups\school-erp-2026-08-07.db --target .\restore-drill\school-erp.db --confirm-restore
npm run db:inspect
```

For a real provider restore, use the provider's documented point-in-time or
snapshot restore workflow instead. Validate migration history, tenant counts,
cross-tenant isolation, authentication, document references, and a sample fee
payment/refund reconciliation. Record the restore point, operator, row-count
checks, RPO/RTO result, and sign-off.

