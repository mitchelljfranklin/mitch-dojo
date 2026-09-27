# Documents & Consent

Health information and signed agreements — the onboarding compliance flow: collect medical context, present the school's documents, and capture signatures.

## Health & medical information

The student form and record carry a **Health & medical** section with three free-text prompts:

- **Prescribed medications** that may impair reaction time or judgement
- **Conditions** staff should be aware of (asthma, epilepsy, …)
- **Illnesses or injuries** that may affect training

This is sensitive information (PHI). It is **not visible to every staff role**: a dedicated **`students:medical`** permission gates the section — seeded onto **Admin** and **Trainer**, not **Viewer**. Custom roles can grant or withhold it independently. It is deliberately **not collected on the public booking page** (an unauthenticated surface); staff complete it during onboarding or the first visit.

## The agreement documents

Each school manages its own set of agreements — the three seeded starters
(privacy notice, informed consent, safety expectations) are placeholders to
replace, and more can be added. All are read + signed by the member (or
their guardian):

- **Privacy information notice** (seeded) — what personal and health data
  you collect, why, and how it's handled
- **Informed consent** (seeded) — acknowledgement that martial arts is a
  contact activity and its risks
- **Safety expectations** (seeded) — what may/may not be worn, respect and
  discipline on the mats
- **Anything you add** — e.g. a code of conduct; add/rename/disable/delete
  documents under [Admin → Documents](../configuration/documents), and the
  title is the name members see everywhere

Signing is per document **version**: saving an edit creates a new version
and every member must re-sign it. Version-change only — no time-based
expiry.

Documents are managed under **Admin → Documents** (`settings:manage`) — add,
rename, disable, or delete freely. Each document has a title and a Markdown
body; **saving creates a new version** (starting from version 0, your first
edit reads as version 1) — the previous version and its signatures stay as
history, and every member must **re-sign the new version**
(version-change-only renewal; no time-based expiry). Seeded with generic
placeholder text — replace it before go-live.

## Signing

Two paths, both recorded against the document version:

- **Digital (portal)** — the member's [portal link](./member-portal) shows a **Documents & consent** section with each document rendered in full; the reader ticks a confirmation, types their name, and signs. The signature (name, date, method `portal`) appears instantly on the staff-side record. The guardian fallback covers minors.
- **Paper (staff-recorded)** — print the form (**Print form** on the student's compliance card): branded PDF with the document text plus the member's name and signature/date lines. After signing in person, staff use **Record signature** (date + who signed) — audit-logged.

The student record's **Agreements & consent** card shows, per document: the active version, signed state ("Signed \<date\> by \<name\>"), "Not signed", or **"Re-sign required"** when a signature exists against an older version.

## Keeping track

The **Compliance** page (sidebar → People) is the school-wide view: every active/trial member with at least one **outstanding** signature — either never signed, or signed before a document's latest version — with a count of students and signatures to chase. Open a student to record a paper signature or send them to the portal.

Two optional helpers keep it moving:

- **Agreement reminders** ([Communication settings](../configuration/communication)) — the scheduler emails each member once per outstanding document version. Because the reminder is keyed to the document's version, bumping the document re-arms it automatically; there is no separate renewal date.
- **Check-in gate** ([Memberships settings](../configuration/memberships)) — when on, QR check-in is refused while a member has an outstanding agreement, mirroring the overdue-balance suspension. Staff marking attendance manually are never blocked.

## Permissions at a glance

| Action | Permission |
|---|---|
| View medical & health information | `students:medical` |
| Edit medical fields, record signatures | `students:edit` (+ medical to see the section) |
| Edit document templates | `settings:manage` |
| View the outstanding-signature report | `students:view` |
| Digital signing | The member's own portal link |
