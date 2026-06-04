# Backup And Restore

## SQL Server Container Backup

Create a backup file inside the mounted backup volume:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env exec db /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C \
  -Q "BACKUP DATABASE [$MSSQL_DATABASE] TO DISK = N'/backups/cold_room.bak' WITH INIT"
```

Copy backup from the named volume or host-mounted backup path according to the server setup.

## Restore

Stop API/web first, then restore:

```bash
docker compose -f infra/docker-compose.prod.yml --env-file .env stop api web
docker compose -f infra/docker-compose.prod.yml --env-file .env exec db /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C \
  -Q "RESTORE DATABASE [$MSSQL_DATABASE] FROM DISK = N'/backups/cold_room.bak' WITH REPLACE"
docker compose -f infra/docker-compose.prod.yml --env-file .env up -d api web
```

## Backup Policy

Recommended minimum:

- full backup daily
- transaction log backups every 15-60 minutes when using full recovery
- 30-day retention
- off-host encrypted storage
- monthly restore drill

## Files To Back Up

- SQL Server database/backups
- production `.env` stored in a secret manager or secure vault
- TLS certificate automation state if not managed by the cloud provider
