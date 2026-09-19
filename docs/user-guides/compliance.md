# Documents & Consent

Health information and signed agreements — the onboarding compliance flow: collect medical context, present the school's documents, and capture signatures.

## Health & medical information

The student form and record carry a **Health & medical** section with three free-text prompts:

- **Prescribed medications** that may impair reaction time or judgement
- **Conditions** staff should be aware of (asthma, epilepsy, …)
- **Illnesses or injuries** that may affect training

This is sensitive information (PHI). It is **not visible to every staff role**: a dedicated **`students:medical`** permission gates the section — seeded onto **Admin** and **Trainer**, not **Viewer**. Custom roles can grant or withhold it independently. It is deliberately **not collected on the public booking page** (an unauthenticated surface); staff complete it during onboarding or the first visit.

## The three agreement documents

Each school provides its own wording for three agreements, all read + signed by the member (or their guardian):

| Document | Purpose |
|---|---|
| **Privacy information notice** | What personal and health data you collect, why, and how it's handled |
| **Informed consent** | Acknowledgement that martial arts is a contact activity and its risks |
| **Safety expectations** | What may/may not be worn, respect and discipline on the mats |

Templates live under **Admin → Documents** (`settings:manage`). Each has a title and a Markdown body; **saving creates a new version** — the previous version and its signatures stay as history, and every member must **re-sign the new version** (version-change-only renewal; no time-based expiry). Seeded with generic placeholder text — replace it before go-live.

## Signing

Two paths, both recorded against the document version:

- **Digital (portal)** — the member's [portal link](./member-portal) shows a **Documents & consent** section with each document rendered in full; the reader ticks a confirmation, types their name, and signs. The signature (name, date, method `portal`) appears instantly on the staff-side record. The guardian fallback covers minors.
- **Paper (staff-recorded)** — print the form (**Print form** on the student's compliance card): branded PDF with the document text plus the member's name and signature/date lines. After signing in person, staff use **Record signature** (date + who signed) — audit-logged.

The student record's **Agreements & consent** card shows, per document: the active version, signed state ("Signed \<date\> by \<name\>"), "Not signed", or **"Re-sign required"** when a signature exists against an older version.

## Permissions at a glance

| Action | Permission |
|---|---|
| View medical & health information | `students:medical` |
| Edit medical fields, record signatures | `students:edit` (+ medical to see the section) |
| Edit document templates | `settings:manage` |
| Digital signing | The member's own portal link |
