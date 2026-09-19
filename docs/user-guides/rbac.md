# RBAC & Roles

Mitch‑Dojo uses **permission-based** access control, not "is authenticated" gating. Three system roles are built in, and admins can create custom roles with any combination of the 21 fine-grained permissions.

## Permission Catalog (21 Permissions)

### Students (5)

| Permission Key | Description |
|---------------|-------------|
| `students:view` | View student list and student detail pages |
| `students:create` | Create students (including CSV import) and work the trial pipeline |
| `students:edit` | Edit students, locations on records, send portal links, record agreement signatures |
| `students:delete` | Delete students (removes their photo + attachments) |
| `students:medical` | View and edit health & medical information (PHI) |

### Locations (1)

| Permission Key | Description |
|---------------|-------------|
| `locations:edit` | Create, edit, and deactivate dojo locations; rotate check-in tokens |

### Classes & Schedule (2)

| Permission Key | Description |
|---------------|-------------|
| `classes:view` | View courses, trainers, and the weekly timetable |
| `classes:edit` | Create/edit courses, trainers, and weekly times; cancel sessions |

### Attendance (2)

| Permission Key | Description |
|---------------|-------------|
| `attendance:view` | View attendance history and sheets |
| `attendance:mark` | Mark attendance and take check-ins |

### Belts & Gradings (2)

| Permission Key | Description |
|---------------|-------------|
| `belts:view` | View disciplines, ladders, and progression pages |
| `belts:edit` | Edit ladders and record promotions |

### Memberships & Payments (2)

| Permission Key | Description |
|---------------|-------------|
| `memberships:view` | View plans, enrollments, invoices, and payments |
| `memberships:edit` | Manage plans/enrollments and record payments |

### Analytics (1)

| Permission Key | Description |
|---------------|-------------|
| `analytics:view` | View the analytics dashboard |

### Communications (1)

| Permission Key | Description |
|---------------|-------------|
| `communications:edit` | Edit reminder settings and email templates |

### Administration (5)

| Permission Key | Description |
|---------------|-------------|
| `audit:view` | View the audit log and email log |
| `users:manage` | Create, disable, and delete users; change roles |
| `roles:manage` | Create, edit, and delete custom roles |
| `settings:manage` | Manage the Admin area (settings, storage, SMTP, retries) |
| `api:manage` | Manage API access (reserved for the Phase 12 REST API) |

### Profile (1)

| Permission Key | Description |
|---------------|-------------|
| `profile:view` | View and edit own profile, password, and preferences |

## Default System Roles

| Role | Permissions | Who It's For |
|------|:----------:|--------------|
| **Admin** | 21 (all) | Full platform control. Locked — cannot be deleted or edited. |
| **Trainer** | 12 | Floor operations: students (no delete) incl. medical visibility, classes, attendance, belts, analytics. No administration. |
| **Viewer** | 7 | Read-only across students, classes, attendance, belts, memberships, analytics. |

System roles are seeded on first run and cannot be deleted.

## Custom Roles

Admins can create custom roles under **Admin → Roles**:

1. Click **Create role**.
2. Name the role and write a description.
3. Select the permissions to grant.
4. Assign the role to any user.

Use them for profiles like "Office manager" (students + memberships + communication, no belts) or "Committee member" (analytics + views only).

## Enforcement

Access control is enforced at every layer:

| Layer | Mechanism | Behavior |
|-------|-----------|----------|
| **Pages** | `requirePermission(key)` | Redirects if denied |
| **Server actions** | `requirePermission(key)` at the start of every action | Rejected if denied |
| **Route handlers** | Permission check before any work | 4xx JSON if denied |
| **UI controls** | `hasPermission(...)` in JSX | Controls are **hidden**, not greyed out |
| **Sidebar & Admin nav** | Permission-filtered navigation | Sections you can't access don't render |
| **Admin gear button** | Shown only with any admin-area permission | Hidden entirely for floor-staff roles |

> **Hide, don't disable.** A role without a permission simply does not see the control. A Trainer gets a clean floor-operations screen — no write buttons they can't use, no admin nav teasing access they don't have.

## Practical Examples

| Action | Admin | Trainer | Viewer |
|--------|:-----:|:-------:|:------:|
| View students | Yes | Yes | Yes |
| Create/import students | Yes | Yes | No |
| Delete students | Yes | No | No |
| Manage locations | Yes | No | No |
| View schedule | Yes | Yes | Yes |
| Edit courses & times | Yes | No | No |
| Mark attendance | Yes | Yes | No |
| Record promotions | Yes | Yes | No |
| Record payments | Yes | No | No |
| View analytics | Yes | Yes | Yes |
| Edit reminder settings/templates | Yes | No | No |
| View audit & email logs | Yes | No | No |
| Manage users/roles/settings | Yes | No | No |
| View/edit own profile | Yes | Yes | Yes |
