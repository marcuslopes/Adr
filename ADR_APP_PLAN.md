# ADR Manager — App Plan

> Architectural Decision Records, made easy for small teams.

---

## Overview

A web application that lets small engineering teams create, manage, search, and link Architectural Decision Records (ADRs) in the MADR format. Supports two storage backends (git-tracked markdown files or a central database), optional AI-assisted drafting, optional git auto-commit, ADR linking, and Slack/email notifications.

---

## Core User Stories

1. **Create an ADR** — Fill in a form (or use AI to draft it), preview the MADR-formatted markdown, and save it.
2. **Browse & search ADRs** — Filter by project, status, author, and date. Full-text search.
3. **Link ADRs** — Mark an ADR as superseding or related to another.
4. **Get notified** — Team members receive a Slack message or email when a new ADR is created or status changes.
5. **Choose storage** — Per-project setting: write to a local/repo markdown directory, or store in a central database.

---

## Tech Stack

| Layer          | Technology                                                  |
|----------------|-------------------------------------------------------------|
| Framework      | **Next.js 14** (App Router) + **TypeScript**               |
| Database       | **PostgreSQL** (for DB mode) via **Prisma ORM**            |
| Auth           | **NextAuth.js** — GitHub OAuth or magic-link email         |
| AI drafting    | **Anthropic Claude API** (optional, on-demand)              |
| Notifications  | **Slack Webhooks** + **Resend** (email)                    |
| File I/O       | Node.js `fs` + optional `simple-git` for auto-commit       |
| Styling        | **Tailwind CSS** + **shadcn/ui** components                |
| Editor         | **CodeMirror** or **TipTap** (markdown with live preview)  |
| Deployment     | Docker-friendly; deployable to Vercel, Fly.io, or any VPS |

---

## Storage Backends

The app supports two backends, configurable per-project in settings.

### 1. File Mode (Markdown in Repo)
- ADRs are written as `.md` files to a configured directory (e.g., `docs/adr/`).
- Files follow the MADR naming convention: `0001-use-postgresql.md`.
- **Optional git auto-commit**: When enabled, the app runs `git add` + `git commit` + `git push` after saving (requires a git token or SSH key configured in settings).
- Read operations scan the directory and parse front-matter + markdown.

### 2. Database Mode (Central Store)
- All ADR content stored in PostgreSQL via Prisma.
- Supports multiple projects in a single instance.
- Full-text search via PostgreSQL `tsvector`.
- Can export any ADR (or all ADRs for a project) as a `.md` file or zip archive.

---

## Data Model (DB Mode)

```prisma
model Project {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  backend     Backend  // FILE or DATABASE
  filePath    String?  // only for FILE mode
  gitAutoCommit Boolean @default(false)
  gitToken    String?
  adrs        Adr[]
  members     ProjectMember[]
  slackWebhook String?
  notifyEmail String?
  createdAt   DateTime @default(now())
}

model Adr {
  id          String   @id @default(cuid())
  number      Int      // sequential per project, e.g. 42
  slug        String   // e.g. "use-postgresql"
  title       String
  status      AdrStatus // PROPOSED | ACCEPTED | DEPRECATED | SUPERSEDED
  context     String   @db.Text
  decision    String   @db.Text
  consequences String  @db.Text
  author      User     @relation(fields: [authorId], references: [id])
  authorId    String
  project     Project  @relation(fields: [projectId], references: [id])
  projectId   String
  supersedes  Adr[]    @relation("Supersedes")
  supersededBy Adr[]   @relation("Supersedes")
  related     Adr[]    @relation("Related")
  relatedTo   Adr[]    @relation("Related")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([projectId, number])
}

enum AdrStatus { PROPOSED ACCEPTED DEPRECATED SUPERSEDED }
enum Backend  { FILE DATABASE }
```

---

## MADR Template

Each ADR is rendered to / parsed from this format:

```markdown
# ADR-0042: <title>

## Status
Accepted

## Context
<context>

## Decision
<decision>

## Consequences
<consequences>

## Links
- Supersedes [ADR-0038](./0038-old-decision.md)
- Related to [ADR-0015](./0015-related.md)
```

---

## Feature Breakdown

### 1. Authentication
- GitHub OAuth (primary) — one-click for dev teams.
- Magic-link email (fallback).
- Project owners can invite members by email.

### 2. ADR Editor
- Split-pane: form fields on the left, live MADR markdown preview on the right.
- Fields: Title, Status (dropdown), Context, Decision, Consequences.
- **Link panel**: search existing ADRs to mark as "supersedes" or "related to".
- **AI Draft button** (optional): user types a one-liner (e.g. _"Use Redis for caching instead of in-memory"_), AI generates draft content for all fields. User reviews and edits before saving.

### 3. ADR List / Browse
- Table view with columns: Number, Title, Status, Author, Date.
- Filter bar: Status, Author, Date range, free-text search.
- Click any ADR to open detail view with rendered markdown.
- Status badge color coding: Proposed (blue), Accepted (green), Deprecated (gray), Superseded (yellow).

### 4. ADR Linking
- On the detail page, "Supersedes" and "Related ADRs" sections show linked cards.
- When an ADR is marked as superseded, its status auto-updates to `SUPERSEDED`.

### 5. Notifications
- **Slack**: POST to a configured webhook when an ADR is created or its status changes. Message includes title, status, author, and a link.
- **Email**: Send via Resend to a configured address (e.g., `eng-decisions@company.com`) with the same information.
- Both are optional, configured per-project in settings.

### 6. Git Auto-Commit (File Mode Only)
- Toggle in project settings.
- On save, the app:
  1. Writes the `.md` file.
  2. Runs `git add <file>`.
  3. Runs `git commit -m "adr: add ADR-0042 use-postgresql"`.
  4. Runs `git push origin <branch>` (configurable branch, default `main`).
- Requires a personal access token or SSH key stored (encrypted) in project settings.

### 7. Export
- Per-ADR: download as `.md`.
- Per-project: download all ADRs as a `.zip` of markdown files.

---

## Application Routes

```
/                          → Landing / login
/projects                  → Project list
/projects/new              → Create project
/projects/[slug]           → ADR list for project
/projects/[slug]/adrs/new  → Create ADR
/projects/[slug]/adrs/[id] → ADR detail view
/projects/[slug]/settings  → Project settings (backend, notifications, git)
/settings                  → User settings (profile, connected accounts)
```

---

## Development Phases

### Phase 1 — Core (MVP)
- [ ] Project setup: Next.js + TypeScript + Tailwind + Prisma + PostgreSQL
- [ ] Auth: NextAuth with GitHub OAuth
- [ ] Project CRUD
- [ ] ADR CRUD (DB mode) with MADR editor + live preview
- [ ] ADR list with basic filters
- [ ] ADR detail page with rendered markdown

### Phase 2 — Collaboration & Linking
- [ ] ADR linking (supersedes / related)
- [ ] Slack notification integration
- [ ] Email notification integration (Resend)
- [ ] Project member invites

### Phase 3 — File Mode & Git
- [ ] File-based backend (read/write `.md` files from a directory)
- [ ] Optional git auto-commit
- [ ] Per-project backend toggle in settings

### Phase 4 — AI & Polish
- [ ] Optional AI-assisted drafting (Claude API)
- [ ] Export: single ADR as `.md`, all ADRs as `.zip`
- [ ] Full-text search (PostgreSQL tsvector)
- [ ] Responsive mobile layout

---

## Project Structure

```
/
├── app/                         # Next.js App Router
│   ├── (auth)/                  # Login/register pages
│   ├── projects/
│   │   ├── page.tsx             # Project list
│   │   ├── new/page.tsx
│   │   └── [slug]/
│   │       ├── page.tsx         # ADR list
│   │       ├── settings/page.tsx
│   │       └── adrs/
│   │           ├── new/page.tsx
│   │           └── [id]/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/
│       ├── projects/
│       ├── adrs/
│       └── ai/draft/            # AI drafting endpoint
├── components/
│   ├── AdrEditor.tsx            # Split-pane editor + preview
│   ├── AdrList.tsx
│   ├── AdrCard.tsx
│   ├── LinkPanel.tsx
│   └── StatusBadge.tsx
├── lib/
│   ├── prisma.ts
│   ├── backends/
│   │   ├── database.ts          # DB read/write logic
│   │   └── filesystem.ts        # File read/write + git logic
│   ├── notifications/
│   │   ├── slack.ts
│   │   └── email.ts
│   ├── ai.ts                    # Claude API integration
│   └── madr.ts                  # MADR serialise/parse utilities
├── prisma/
│   └── schema.prisma
├── docker-compose.yml           # PostgreSQL for local dev
└── .env.example
```

---

## Environment Variables

```env
# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/adr_manager

# AI (optional)
ANTHROPIC_API_KEY=

# Email (optional)
RESEND_API_KEY=
NOTIFICATION_FROM_EMAIL=noreply@yourdomain.com

# Encryption key for stored git tokens
ENCRYPTION_KEY=
```

---

## Open Questions / Decisions to Make Later

1. **File mode path resolution**: Should the app run on the same machine as the repo, or connect to a remote filesystem/volume?
2. **Multi-project file mode**: Should different projects map to different directories on the same host?
3. **ADR numbering in file mode**: Auto-detect the next number by scanning existing filenames, or manage centrally?
4. **Rate limiting**: Needed on the AI drafting endpoint to avoid unexpected API cost spikes.
