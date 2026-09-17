# Storage

Where uploaded files live — student photos and attachments, and the organization logo.

## Provider

| Provider | Fields | Notes |
|---|---|---|
| **Local disk** (default) | — | Files under `DATA_STORAGE_PATH`; ships with the container's volume |
| **S3** | Bucket, region, access key ID, secret access key | Any S3-compatible endpoint |
| **Azure Blob** | Connection string, container name | — |

Switching providers changes where *new* files go; existing files are **not** moved automatically (the UI states this — plan a copy step with `aws s3 sync` / `azcopy` if migrating).

::: danger Credentials
Cloud credentials are AES-256-GCM encrypted at rest and never returned to the client. If `APP_ENCRYPTION_KEY` is rotated, saved credentials become undecryptable and storage stops working until re-entered.
:::

## File rules

| Setting | Default | Notes |
|---|---|---|
| **Max upload size** | 20 MB | Per file |
| **Allowed extensions** | pdf, png, jpg, jpeg, docx, xlsx | Extend the list as needed |

Uploads are validated beyond the extension: MIME allowlist plus magic-byte sniffing, so a renamed `.exe` doesn't get through.

## Files are served, never exposed

There are no public file URLs. Photos, attachments, and the logo are served through authenticated routes; the logo route is public (it appears on unauthenticated pages) but only serves that one object.

## Lifecycle

- **Deleting a student** deletes their photo and attachments from storage immediately.
- **Orphan sweep** — the scheduler collects every referenced storage key and deletes unreferenced files, so a crashed upload or a missed cleanup can't leak disk space.

## Known gap

There is no "test connection" button yet — a bad connection string surfaces on the first upload. Listed in [phasereview](https://github.com/mitchelljfranklin/mitch-dojo) as a candidate improvement.

Requires `settings:manage`. Changes are audited.
