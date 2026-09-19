# Documents

The school's agreement documents — the policies members read and sign
([Compliance guide](../user-guides/compliance) covers the full signing flow).
The set is **yours to manage**: the three seeded starters (privacy notice,
informed consent, safety expectations) are placeholders to replace, and you
can add, rename, disable, or delete documents freely.

The count is deliberately not fixed — some schools need one form, some need
five. Each document is:

- **Titled** — the title IS the document's name everywhere: the member
  portal's Documents & consent card, the student record's compliance card,
  and the printed form's header
- **Markdown-bodied** — headings, paragraphs, lists; rendered on the portal
  and in the printable PDF
- **Versioned** — every save creates a new version (seeded/new documents
  start at version 0, so your first edit reads as version 1). Saving means
  every member must re-sign the new version; prior versions and signatures
  stay as history

## Managing documents

1. Go to **Admin → Documents**.
2. Use **Add document** for a new agreement (title + body) — it goes live
   for members immediately at version 0.
3. Edit any document's title/body and **Save as version N+1** — a re-sign
   is required from every member.
4. **Disable** to hide a document from members without deleting it (existing
   signatures are preserved).
5. **Delete** to remove a document and all of its versions and signatures
   permanently (with confirmation).

Version history per document shows each saved version, who saved it, and
how many members signed it.

::: tip Replace the placeholders before go-live
The seeded documents contain generic placeholder text. Edit and save each
one — your wording becomes version 1, which is what members sign.
:::

Requires `settings:manage`. Changes are audited.
