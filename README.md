# ADR Manager

A web application for small engineering teams to create, manage, search, and link **Architectural Decision Records (ADRs)** in the [MADR](https://adr.github.io/madr/) format.

## Features

- **MADR editor** with live markdown preview and split-pane layout
- **Two storage backends** per project: PostgreSQL (central DB) or local markdown files
- **ADR linking** — mark ADRs as superseding or related to each other
- **AI-assisted drafting** via Claude API (optional, rate-limited to 10/hour)
- **Slack & email notifications** when ADRs are created or status changes
- **Git auto-commit** — automatically commit and push `.md` files (file mode)
- **Export** — single ADR as `.md` or all ADRs as a `.zip`
- **Team members** — invite colleagues to a project by email
- **GitHub OAuth** + magic-link email login

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Docker (for local PostgreSQL) _or_ an external PostgreSQL instance
- A GitHub OAuth app (for GitHub login)

### 2. Clone & install

```bash
git clone <repo-url> adr-manager
cd adr-manager
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Description |
|---|---|
| `NEXTAUTH_SECRET` | Random secret: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | App URL, e.g. `http://localhost:3000` |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |
| `DATABASE_URL` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | _(optional)_ Enable AI drafting |
| `RESEND_API_KEY` | _(optional)_ Enable email notifications |
| `NOTIFICATION_FROM_EMAIL` | _(optional)_ From address for emails |

### 4. Start the database

```bash
docker-compose up -d
```

### 5. Run migrations

```bash
npx prisma db push
```

### 6. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## GitHub OAuth Setup

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
2. Set **Homepage URL**: `http://localhost:3000`
3. Set **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Copy the **Client ID** and **Client Secret** into `.env`

---

## Project Backends

### Database mode (default)
ADRs are stored in PostgreSQL. Supports multi-project hosting, instant export, and full-text search.

### File mode
ADRs are written as `.md` files to a directory on the server (e.g., `docs/adr/` inside a cloned repo). Filenames follow MADR convention: `0001-use-postgresql.md`.

**Git auto-commit** (optional): When enabled, the app commits and pushes each new ADR automatically. Configure in project settings with a personal access token.

---

## Architecture

```
app/
  login/                  # Auth pages
  projects/               # Project list + create
  projects/[slug]/        # ADR list, detail, editor, settings
  api/                    # REST API routes
  settings/               # User profile

components/
  AdrEditor.tsx           # Split-pane MADR editor + preview
  AdrListClient.tsx       # Filterable ADR table
  Navbar.tsx, StatusBadge.tsx

lib/
  auth.ts                 # NextAuth config
  madr.ts                 # MADR serialization
  ai.ts                   # Claude API integration
  rateLimit.ts            # In-memory rate limiter (10 AI drafts/hour/user)
  backends/filesystem.ts  # File I/O + git
  notifications/          # Slack + Resend email

prisma/schema.prisma      # DB schema
docker-compose.yml        # Local PostgreSQL
```

---

## API

All endpoints require authentication (session cookie).

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects` | List projects |
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects/:slug` | Get project |
| `PATCH` | `/api/projects/:slug` | Update project settings |
| `DELETE` | `/api/projects/:slug` | Delete project |
| `GET` | `/api/projects/:slug/adrs` | List ADRs (supports `?status=&q=&authorId=`) |
| `POST` | `/api/projects/:slug/adrs` | Create ADR |
| `GET` | `/api/projects/:slug/adrs/:id` | Get ADR |
| `PATCH` | `/api/projects/:slug/adrs/:id` | Update ADR |
| `DELETE` | `/api/projects/:slug/adrs/:id` | Delete ADR |
| `GET` | `/api/projects/:slug/adrs/:id/export` | Download ADR as `.md` |
| `GET` | `/api/projects/:slug/export` | Download all ADRs as `.zip` |
| `GET` | `/api/projects/:slug/members` | List members |
| `POST` | `/api/projects/:slug/members` | Add member by email |
| `DELETE` | `/api/projects/:slug/members/:userId` | Remove member |
| `POST` | `/api/ai/draft` | AI-draft ADR fields (rate-limited) |
| `GET` | `/api/user` | Get current user |
| `PATCH` | `/api/user` | Update display name |

---

## Deployment

The app is a standard Next.js application. Deploy to:

- **Vercel**: `vercel --prod` (set env vars in dashboard, use managed Postgres)
- **Fly.io**: `fly launch` + attach a Postgres database
- **Docker**: Build with `docker build -t adr-manager .` and run with the env vars above

---

## License

MIT
