# Backups

What to protect and how, per mode.

## What lives where

| Data | Postgres mode | Lite mode |
|---|---|---|
| All records (students, attendance, belts, invoices, settings) | Postgres volume | `pglite_data` volume |
| Uploaded files (photos, attachments, logo) | `DATA_STORAGE_PATH` mount | `DATA_STORAGE_PATH` mount |

Back up **both** the database and the storage mount.

## Lite mode

### Automatic pre-migration snapshots

Before every migration the container snapshots the database into the `pglite_backups` volume (last 3 kept). These protect against **failed updates** — see the restore procedure in [Lite Mode](./lite#updating-a-lite-deployment).

### Scheduled snapshots (recommended, especially on an SD card)

Pre-migration backups don't protect against SD-card wear or power loss. Snapshot the volume on a schedule — weekly is a good baseline:

```bash
# /etc/cron.weekly/dojo-backup (on the host)
docker run --rm -v mitch-dojo_pglite_data:/data -v /var/backups/dojo:/backup alpine \
  tar czf /backup/pglite-$(date +%F).tar.gz -C /data .
# prune: keep the last 8
ls -1t /var/backups/dojo/pglite-*.tar.gz | tail -n +9 | xargs -r rm
```

**Restore** = stop the container, extract the archive into the volume, start.

## Postgres mode

Use standard Postgres tooling against the `db` container:

```bash
# backup
docker exec mitch-dojo-db-1 pg_dump -U mitch mitch_dojo | gzip > dojo-$(date +%F).sql.gz

# restore
gunzip -c dojo-2026-09-17.sql.gz | docker exec -i mitch-dojo-db-1 psql -U mitch mitch_dojo
```

Schedule it the same way (host cron → `docker exec`), keep copies off the machine, and prune old dumps. Adjust the container name, user, and database name to your compose values.

## Files

Sync the storage mount like any other directory — `restic`, `rclone`, or plain `tar` all work. If you use S3/Azure storage, the provider holds the files; still keep the database backup, since the DB rows are what map files to students.
