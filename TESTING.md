# Manual Test Plan — Tiers 1–3

A hands-on checklist to validate the recent feature work (invoice tax, agreement
lifecycle, incidents, reports, portal self-service, storage test, trial capacity,
calendar invites, and membership CSV import) against a running deployment.

Work top to bottom. Each step tells you **what to do** and **what you should
see**. Tick the box when it behaves.

---

## 0. Before you start

- [ ] **Migrations run automatically** on container start (the entrypoint runs
      `prisma migrate deploy`, or the PGlite runner in lite mode). If you applied
      the new image, just restart the container.
- [ ] **Seed once for the new permissions.** `incidents:view` / `incidents:manage`
      are added to the seeded system roles only when the seed runs, and the
      container only seeds once (marker-guarded). On an existing deployment run:

      Postgres mode:
      ```bash
      docker compose -f docker-compose.pull.yml exec app npx prisma db seed
      ```

      Lite mode (PGlite is single-process — stop the app first):
      ```bash
      docker compose -f docker-compose.lite-pull.yml stop app
      docker compose -f docker-compose.lite-pull.yml run --rm --entrypoint npx app prisma db seed
      docker compose -f docker-compose.lite-pull.yml start app
      ```

      Then **refresh** the app in your browser (permissions reload per request —
      no need to sign out).
- [ ] **Have some data ready**: at least one location, one discipline, one
      student, one course, one membership plan, and a week or two of past
      sessions marked with attendance.
- [ ] **SMTP** (Admin → Email) is optional. Reminder/confirmation emails in this
      plan only *send* with SMTP configured; without it you'll still see the
      attempt recorded in the Email log.

---

## 1. Quick smoke (5 minutes)

- [ ] Sign in as **Admin**.
- [ ] Sidebar shows: Dashboard, **Analytics**, **Reports**, Schedule, Classes,
      Attendance, Belts & Gradings, Students, **Households**, Trials,
      **Compliance**, **Incidents**, Trainers, Memberships, Invoices, Admin.
- [ ] **Admin → Storage** loads; **Admin → Documents** loads; **Admin →
      Memberships** loads; **Admin → Communication** loads.
- [ ] Open a student record — you can see the **Agreements & consent**,
      **Incident reports**, and **Memberships** cards.

---

## 2. Invoice tax / GST

**Set the rate**

- [ ] Go to **Admin → Memberships**.
- [ ] Set **Tax / GST rate (%)** to `10` and **Tax label** to `GST`, then
      **Save membership settings**.
- [ ] Reload the page — the values persisted.

**Apply it**

- [ ] Go to **Memberships → Invoices → New invoice** (or a student record →
      Memberships) and raise an invoice for a plan.
- [ ] Open the invoice. The **Summary** now shows three lines:
      **Subtotal**, **GST**, **Total**, where `Total = Subtotal + 10%`.
- [ ] Click **Download PDF** — the PDF shows the same subtotal / GST / total.
- [ ] (If you use recurring invoices) run **Memberships → Generate now** and
      confirm newly generated invoices carry the tax.

**History is preserved**

- [ ] Change the rate to `5` and save.
- [ ] Re-open the **earlier** invoice — it still shows the original **10%**
      GST (rate is captured at creation, not recalculated).

---

## 2b. Bulk invoice payments

- [ ] On **Memberships → Invoices**, confirm you can open an invoice directly —
      the **#** link and the **Open** button both go to the invoice detail.
- [ ] With at least two open invoices, tick their checkboxes (or the header
      checkbox to select all). A bar appears showing "N invoices selected".
- [ ] Click **Record payment**, choose a method and date, and confirm. The
      result reports how many payments were recorded.
- [ ] The selected invoices now show a **Paid** status and a zero balance.
      (A part-paid invoice is topped up to zero, not double-charged.)
- [ ] Re-select the same invoices and record again — the result reports nothing
      to record (already settled).

---

## 3. Agreement lifecycle

**Outstanding report**

- [ ] Go to **Admin → Documents** and confirm at least one document is enabled
      (add one if needed; use the version editor to change a body).
- [ ] Open **Compliance** (sidebar → People). You should see a count of
      students with outstanding signatures and a row for each such student
      listing the document(s) they still owe.

**Sign as staff, then re-arm with a new version**

- [ ] Open one of those students → **Agreements & consent** → **Record
      signature** for a document.
- [ ] Back on **Compliance**, that document no longer appears for the student
      (once everything is signed the student drops off the list).
- [ ] In **Admin → Documents**, edit that document's body and **Save** (this
      creates a new version). The student reappears on **Compliance**, showing
      the document as **re-sign required**.

**Reminders (optional — needs SMTP to send)**

- [ ] **Admin → Communication** → tick **Enable agreement reminder emails** →
      Save. On the next scheduler tick, outstanding members get one reminder
      per unsigned/out-of-date document (check **Admin → Email log**).

**Optional check-in gate**

- [ ] **Admin → Memberships** → tick **Block QR check-in until agreements are
      signed** → Save.
- [ ] Open a location's **QR check-in** page and tap a student who has an
      outstanding agreement → you see **"Agreement signature required"** and no
      attendance is recorded.
- [ ] Mark that student present manually on an **attendance sheet** — it still
      works (staff are never gated).
- [ ] Turn the gate back off afterwards.

---

## 4. Incident reports (accident book)

- [ ] Open **Incidents** (sidebar → People) — it shows the accident book list
      and a **Log incident** button.
- [ ] Click **Log incident**, fill in a title, today's date, severity,
      optionally a student and location, and what happened; submit.
- [ ] The form reports success (Done); close it. The entry appears in the
      list — **only once** (the create form is now disabled while saving).
- [ ] Open it and try: **edit** a field and save; **Close incident** (status
      becomes Closed, a closed date is set); **Reopen**; then **Delete**
      (confirm) and the entry is gone.
- [ ] Log another incident tied to a student, then open that **student record** —
      the **Incident reports** card lists it and links back.
- [ ] If you have a non-Admin role without incident permissions, sign in as that
      user — they do **not** see **Incidents** in the sidebar.

---

## 5. Reports

- [ ] Open **Reports** (sidebar → Overview).
- [ ] **Attendance rate**: a table of active/trial students with Attended /
      Eligible / Rate for the last 30 days, plus a school average. Students with
      no eligible sessions show "—".
- [ ] **Birthdays this month** and **Training anniversaries** list the relevant
      students (anniversaries only for 1+ years).
- [ ] **Revenue**: "Estimated monthly recurring revenue" + "Collected (last 6
      months)" cards, a **By plan** table, and a **Recurring estimate by plan**
      table.
- [ ] Check each card's **Export CSV** button downloads a `.csv` (opens in a
      spreadsheet with the expected columns).

---

## 6. Member portal self-service

Send yourself a portal link first (student record → **Email portal link**, or
Students → Households → **Email portal link**), then open it.

- [ ] The portal header has **Add classes to calendar** and **Sign out**.
- [ ] **Your details** card: change email/phone/address/emergency/guardian
      fields → **Save contact details** → success toast; reload and the new
      values are shown.
- [ ] **Email preferences**: tick **Pause non-essential emails** → **Save email
      preference**. (Payment reminders and account emails are unaffected.)
- [ ] **Your account** card: each invoice has a **PDF** link that downloads the
      invoice PDF.
- [ ] **Documents & consent**: each document has a **Download PDF** link; an
      unsigned one still shows the signing form.
- [ ] **Add classes to calendar** downloads `classes.ics` — import it into a
      calendar app and confirm the upcoming classes appear at the right
      dates/times.
- [ ] **Household link** (if you made one): the child switcher appears and
      switching children updates the page; the calendar download includes the
      family's classes.

---

## 6b. Households

- [ ] Open **Households** from the sidebar (People group).
- [ ] Click **New household**, enter a name and contact details, and create it.
      Close the form; the household appears in the list.
- [ ] Click **Edit** on a household, change the contact details, and save;
      reopen Edit to confirm the changes persisted.
- [ ] Edit a student and assign them to the household; blank guardian fields
      inherit the household contact.
- [ ] Use **Email portal link** on the household and confirm the portal shows a
      child switcher (see section 6).

---

## 7. Storage test connection

- [ ] Go to **Admin → Storage**.
- [ ] Leave it on **Local disk**, click **Save storage settings**, then click
      **Test storage connection** → **success** toast ("Storage connection OK.").
- [ ] (Optional, S3/Azure) Enter valid credentials → Save → test → success.
      Enter deliberately bad credentials → Save → test → a **failure** toast with
      the error. Restore good values afterwards.
- [ ] The probe file is cleaned up automatically (nothing lingers in the
      bucket/container or the local storage folder).

---

## 8. Trial capacity per slot

- [ ] Go to **Classes**, open a course, **Edit**.
- [ ] On a weekly slot that is **Trial bookable**, set **Capacity** to `1` →
      Save.
- [ ] Open the public booking page (`/book` in a private window). Choose the
      location + discipline — the class appears.
- [ ] Book it once with a fresh email — you get the confirmation/"booked" state.
- [ ] Book again with a **different** email — the class now shows **(full)** and
      can't be selected; a crafted submission is rejected with the "fully
      booked" message.
- [ ] On the **Trials** page, mark the trial **Lost** (or **Convert**) — the
      capacity frees up and the class becomes bookable again.
- [ ] Set the slot's Capacity back to blank (unlimited) when done.

---

## 9. Membership CSV import

- [ ] Go to **Memberships → Import**.
- [ ] Prepare a CSV with the header row exactly:
      `Email,FirstName,LastName,Plan,StartDate`
      and one row per student, using a real student email (or first+last name)
      and an **exact** plan name. Leave StartDate blank to default to today.
- [ ] Upload it → the result reports how many enrollments were created (and how
      many were already enrolled).
- [ ] Open one of those students' records → **Memberships** shows the new
      enrollment.
- [ ] Re-run the same import → every row is reported as already enrolled (no
      duplicates).
- [ ] Try a row with a typo'd plan name → the result lists that row's problem.

---

## Sign-off

| Area | Pass? | Notes |
|---|---|---|
| Invoice tax / GST | ☐ | |
| Agreement lifecycle (report, reminders, gate) | ☐ | |
| Incident reports | ☐ | |
| Reports (+ CSV) | ☐ | |
| Portal self-service (contact, prefs, PDFs, calendar) | ☐ | |
| Storage test connection | ☐ | |
| Trial capacity | ☐ | |
| Membership CSV import | ☐ | |

If anything fails, note the screen and the exact steps; include any server log
lines or the affected record id, and we can pick it up from there.
