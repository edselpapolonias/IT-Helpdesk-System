# SPUS Helpdesk Deployment

This repository is prepared for a free-tier deployment with:

- Render Static Site for `Frontend`
- Render Web Service for `Backend`
- Neon PostgreSQL for persistent database data
- Cloudinary for persistent private user uploads

## 1. Create the external services

1. Create a Neon project and copy its pooled PostgreSQL connection string.
2. Create a Cloudinary account and copy the `CLOUDINARY_URL` value from its API keys page.
3. In Render, create a Blueprint from this GitHub repository. Render will read `render.yaml` and create the frontend and backend services.

## 2. Fill the Blueprint variables

Use these values when Render asks for environment variables:

- Backend `DATABASE_URL`: the Neon pooled connection string.
- Backend `CLOUDINARY_URL`: the Cloudinary environment URL. Keep it secret.
- Backend `FRONTEND_URL`: the final frontend URL, such as `https://spus-helpdesk.onrender.com`.
- Backend `CORS_ALLOWED_ORIGINS`: the same frontend URL.
- Backend `CSRF_TRUSTED_ORIGINS`: the same frontend URL.
- Frontend `VITE_API_URL`: the backend URL ending in `/api`, such as `https://spus-helpdesk-api.onrender.com/api`.

If Render assigns different service names, use the URLs shown in the Render dashboard.

## 3. Redeploy after URLs are known

Render generates the service URLs during creation. Update the environment variables above with the exact URLs, then manually deploy both services once more. The frontend must be rebuilt after changing `VITE_API_URL` because Vite embeds it at build time.

## 4. Create the first administrator

Render's free web services do not provide shell access. Set these backend variables before deploying:

- `INITIAL_ADMIN_EMAIL`: the email you will use to log in.
- `INITIAL_ADMIN_PASSWORD`: a strong temporary password.
- `INITIAL_ADMIN_USERNAME`: an optional username; when empty, the email is used.

The build runs `python manage.py bootstrap_admin` after migrations. It creates the account with the `ADMIN` role, or safely promotes the matching email if it already exists. Later deploys do not reset the account password.

## Migrating the three existing accounts without tickets

Use the account-only migration utility when the local database already has the
Admin, Technician, and Regular User accounts that must be retained:

```text
python Backend/scripts/migrate_accounts_to_database.py
python Backend/scripts/migrate_accounts_to_database.py --apply
```

Each command reads one JSON object from standard input in this form:

```json
{"database_url":"<Neon pooled connection string>"}
```

Run the command without `--apply` first. The utility refuses to migrate unless
the local database contains exactly three accounts and the destination is empty
or already contains the same three records. Applying the migration:

- preserves account IDs, roles, password hashes, profile fields, and status;
- copies Django group and user-permission relationships;
- does not copy tickets, sessions, authentication tokens, or account audit logs;
- verifies that the destination ticket count did not change; and
- creates ignored backups under `Backend/private_backups/` before writing.

## Deployment behavior

- The backend build installs dependencies, collects static files, and runs database migrations.
- WhiteNoise serves Django Admin static files.
- Uploaded profile images and ticket attachments use authenticated Cloudinary assets when `CLOUDINARY_URL` is set. Local development continues to use `Backend/private_media`.
- `GET /api/health/` is the Render health check endpoint.
- Secrets stay in environment variables and must never be committed.
