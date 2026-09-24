# Account permissions rollout

This change requires the database migration **before** the matching application release.
It has not been applied to the production database by this change.

## Behavior

- The existing owner ID and all existing super-admin accounts cannot be demoted, disabled, or deleted through user administration. A database trigger also protects their profile identity, role and active flag, including cascading Auth deletion. No existing account row or password is changed by the migration.
- Settings creates real Supabase Auth accounts with an initial password (12 characters minimum), edits profiles, disables/restores accounts, deletes Auth accounts, and actually changes eligible users' passwords. Passwords are not placed in audit records.
- Permissions are assigned by role in Settings. Server checks and the interface read the same database matrix. Concurrent edits require a reload instead of silently overwriting another administrator's changes.
- Delegated administrators cannot change their own account, existing super admins, peers, higher ranks, or grant permissions they do not have.
- Disabled or missing profiles fail authorization even if a session remains valid. Signup metadata cannot choose a privileged role; new public signups start inactive.
- User administration no longer treats local JSON profiles as login accounts or reports success after a failed database/Auth operation. Ordinary business reads no longer merge unrestricted local JSON data into database results.

## Before release

1. Take a database backup and record the currently deployed application commit. Test against a staging copy with the same policies, triggers and foreign keys as production.
2. Confirm the existing owner profile `db13125d-3aa1-46ab-9159-8fad18746623` is already active with role `super_admin`. The migration aborts without changes if this check fails; investigate the mismatch instead of replacing or promoting the owner's account.
3. Reconcile any legacy local-only users with actual Auth accounts and matching profile UUIDs. Local profile files no longer provide authentication or authorization. Review/export any custom permissions previously saved only in JSON; the new matrix initially uses the repository's defaults and can then be edited in Settings.
4. Confirm server-only `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured. Never expose the service key to browser code.
5. Apply `supabase/migrations/202609230001_account_permissions.sql` as the database owner. It runs in a transaction, preserves existing account values, and keeps an existing permissions matrix on repeat execution. It replaces security-table policies and adds restrictive checks to business tables; inspect staging for interactions with custom policies/RPCs.
6. Deploy the matching application, then sign in as the existing owner. In Settings, create a temporary staff account, test login, change its role permissions, disable it while a session is open, and verify subsequent requests are denied. Delete the temporary account and verify both Auth and profile removal. Check the audit list.
7. Verify representative company, transaction, attachment, notification and deposit workflows for each deployed role. Existing row-scope policies still apply; this is not a replacement for auditing all custom SECURITY DEFINER RPCs or private-storage policies.

Permanent deletion may be rejected by existing foreign keys; the UI reports that failure. Archive/disable the account when historical references must remain. No automatic bulk account deletion or reassignment is performed.

## Verification

```sh
npm ci
npm run test:permissions
npx tsc --noEmit
npm run build
npx eslint .
```

The permissions suite runs actual application authorization code with controlled Auth/database mocks, plus the migration against an ephemeral PostgreSQL-compatible PGlite database. It never connects to production. The full repository currently has six pre-existing ESLint errors outside this work's authorization changes; build/typechecking and the dedicated tests are separate checks.

If rollout fails, restrict access while investigating. Do not blindly deploy the old application against the new security schema or undo the protection trigger: the old implementation relies on insecure profile/metadata/local-file fallbacks. Restore a known-good application/database pair only through a reviewed recovery procedure that preserves account changes since the backup.
