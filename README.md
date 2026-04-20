# 🤖 OpenMetadata Good-First-Issue Catcher

An autonomous agent that watches the [OpenMetadata](https://github.com/open-metadata/OpenMetadata) GitHub repository every minute for new unassigned **good-first-issues**, claims them on your behalf using an AI-generated comment (powered by Gemini), and sends you real-time email alerts via Resend.

Built for the **WeMakeDevs × OpenMetadata Hackathon** — $100 per merged PR. ⚡

---

## ✨ Features

- 🔍 **Checks every minute** for new unassigned `good-first-issue` issues
- 🤖 **Gemini AI** generates a compelling, human-like comment to claim each issue
- 💬 **Posts comment** on your behalf via GitHub API
- 📧 **Email notifications** via Resend for:
  - 🎯 New issue discovered
  - ✅ Comment successfully posted
  - ❌ Any errors encountered
- 💾 **Persistent state** — never double-comments on the same issue
- 🐳 **Docker-ready** — deploy to Coolify in minutes

---

## 🚀 Quick Start

### 1. Clone & Configure

```bash
git clone <your-repo-url>
cd openmetadata-issue-catcher
cp .env.example .env
```

Edit `.env` with your credentials (see [Environment Variables](#environment-variables) below).

### 2. Run Locally

```bash
npm install
npm start
```

### 3. Deploy to Coolify

See [Coolify Deployment Guide](#coolify-deployment) below.

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | ✅ | GitHub Personal Access Token with `repo` scope |
| `GITHUB_USERNAME` | ✅ | Your GitHub username (to avoid double-commenting) |
| `GITHUB_REPO_OWNER` | ❌ | Repo owner (default: `open-metadata`) |
| `GITHUB_REPO_NAME` | ❌ | Repo name (default: `OpenMetadata`) |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `RESEND_API_KEY` | ✅ | Resend API key |
| `RESEND_FROM_EMAIL` | ✅ | Verified sender email (e.g. `bot@yourdomain.com`) |
| `RESEND_TO_EMAIL` | ✅ | Where to send notifications (your email) |
| `CRON_SCHEDULE` | ❌ | CRON expression (default: `* * * * *` = every minute) |
| `ACTION_DELAY_MS` | ❌ | Delay between actions in ms (default: `2000`) |

### Getting Your Keys

#### GitHub Token
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token"
3. Select scope: `repo` (full repo access)
4. Copy the token

#### Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Click "Get API Key" → Create

#### Resend API Key
1. Sign up at [resend.com](https://resend.com)
2. Add and verify your domain
3. Go to API Keys → Create API Key

---

## 🐳 Coolify Deployment

### Method 1: Docker Compose (Recommended)

1. **Push your code** to a GitHub/GitLab repo

2. **In Coolify**, create a new service:
   - Source: Git Repository
   - Build Pack: **Docker Compose**
   - Select `docker-compose.yml`

3. **Add environment variables** in Coolify's env editor (copy from `.env.example`)

4. **Deploy** — Coolify handles the rest ✅

### Method 2: Dockerfile Only

1. In Coolify, create a new service:
   - Source: Git Repository
   - Build Pack: **Dockerfile**

2. Add environment variables

3. Add a persistent volume:
   - Container Path: `/app/data`
   - This stores `seen_issues.json` across restarts

4. Deploy!

### Persistent State Note

The `seen_issues.json` file tracks which issues have been processed. In Docker, this is stored in the `/app/data` volume. Make sure this volume is **persisted** in Coolify (it is, by default with Docker Compose).

---

## 📁 Project Structure

```
openmetadata-issue-catcher/
├── src/
│   ├── index.js        # Main entry — CRON scheduler + orchestrator
│   ├── github.js       # GitHub API (fetch issues, post comments)
│   ├── gemini.js       # Gemini AI comment generator
│   ├── email.js        # Resend email notifications
│   └── state.js        # Persistent issue tracking
├── Dockerfile          # Multi-stage production Docker build
├── docker-compose.yml  # Coolify-ready compose config
├── package.json
├── .env.example        # Environment variable template
└── README.md
```

---

## 🧠 How It Works

```
Every minute (CRON):
  1. Fetch all open good-first-issues from OpenMetadata
  2. Filter to unassigned issues not yet processed
  3. For each new issue:
     a. Send "New issue found" email 📧
     b. Generate AI comment with Gemini 🤖
     c. Check if already commented (safety check)
     d. Post comment to GitHub 💬
     e. Send "Success" or "Error" email 📧
     f. Mark issue as seen 💾
```

---

## ⚠️ Important Notes

- The agent claims issues by **commenting**, not by being officially assigned. Maintainers must assign you after seeing your comment.
- GitHub rate limits: The default 2-second delay between actions helps stay within limits.
- The `seen_issues.json` file persists state. **Don't delete it** between restarts or the bot will re-comment on old issues.

---

## 📄 License

MIT — Built for WeMakeDevs × OpenMetadata Hackathon 2026
