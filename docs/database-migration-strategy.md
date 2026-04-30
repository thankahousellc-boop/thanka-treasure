# Database Migration Strategy (Drizzle)

This project uses Drizzle migrations as the source of truth for schema changes.

## Environment Model

- Runtime queries use `DATABASE_URL`.
- Migration commands use `DIRECT_DATABASE_URL`.
- Never run migration commands against production without backup verification.

## Standard Workflow

1. Update Drizzle schema files in `db/schema/*`.
2. Generate migration SQL:

```bash
pnpm db:generate
```

3. Review generated SQL in `drizzle/migrations/`.
4. Apply locally or in development:

```bash
pnpm db:migrate
```

5. Verify app behavior and run diagnostics before merging.
6. Validate schema/migration parity:

```bash
pnpm db:parity
```

The parity check is non-destructive: it generates a temporary Drizzle snapshot
and compares it to the latest committed snapshot in `drizzle/migrations/meta`.

## Deployment Workflow

1. Ensure latest migrations are committed to git.
2. Confirm production backup/PITR is enabled.
3. Deploy application.
4. Run migrations in production using production `DIRECT_DATABASE_URL`.
5. Verify critical flows:
   - Product read/write
   - Checkout session creation
   - Stripe webhook processing
   - Admin order list/detail

## Rollback Guidance

- Prefer forward-fix migrations over destructive rollback.
- If immediate rollback is required:
  - Revert app deployment.
  - Restore database from PITR/snapshot if schema changes are incompatible.
- Keep migrations additive when possible (add columns/tables first, remove later).

## Safety Rules

- Do not edit already-applied migration files.
- Do not combine unrelated schema changes in one migration.
- Keep migration names descriptive and reviewable.
- Test webhook and checkout paths after every order-related migration.
