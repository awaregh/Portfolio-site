# SaaS Website Builder

A production-grade backend platform for dynamic site generation, versioned publishing, and multi-tenant content delivery. Built with Node.js, TypeScript, Express, Prisma, BullMQ, and S3-compatible storage.

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│   Client     │───▶│  Express API │───▶│  PostgreSQL  │
│  (Browser)   │    │              │    │   (Prisma)   │
└─────────────┘    └──────┬───────┘    └──────────────┘
                          │
                          │ Publish
                          ▼
                   ┌──────────────┐    ┌──────────────┐
                   │   BullMQ     │───▶│ Build Worker  │
                   │   (Redis)    │    │              │
                   └──────────────┘    └──────┬───────┘
                                              │
                          ┌───────────────────┘
                          │ Upload artifacts
                          ▼
                   ┌──────────────┐
                   │  S3 / MinIO  │
                   │  (Artifacts) │
                   └──────┬───────┘
                          │
                          │ Serve
                          ▼
                   ┌──────────────┐
                   │ Site Serving  │──▶ Built HTML
                   │  Endpoint    │
                   └──────────────┘
```

### How It Works

1. **Content Creation**: Users create sites with structured JSON page content via the API (representing a visual editor's output).
2. **Build Pipeline**: When a user publishes, a `SiteVersion` and `BuildJob` are created. The job is enqueued to BullMQ.
3. **Build Worker**: An async worker picks up the job, renders each page from JSON into full HTML, uploads artifacts to S3 under a versioned prefix.
4. **Atomic Deploys**: Once all artifacts are uploaded, the site's `activeVersionId` pointer is atomically updated.
5. **Serving**: The `/serve/:subdomain` endpoint resolves the subdomain → active version → S3 key and streams the built HTML.
6. **Rollback**: Instant rollbacks by changing the `activeVersionId` pointer to any previous READY version.

## Features

- **Multi-tenant architecture** — full tenant isolation with RBAC (Admin, Editor, Viewer)
- **Versioned publishing** — every publish creates an immutable version with full artifact trail
- **Atomic deploys** — pointer-based activation means zero-downtime deploys
- **Instant rollback** — roll back to any previous version in milliseconds
- **Distributed build workers** — BullMQ-based async processing with retries and concurrency control
- **S3-compatible storage** — MinIO for local dev, any S3-compatible service in production
- **HTML rendering engine** — converts structured JSON content into responsive, themed HTML5 pages
- **CDN-ready serving** — content-type aware serving with proper cache headers
- **Custom domain support** — per-site custom domain configuration

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 20+ |
| Language | TypeScript 5.6 |
| Framework | Express 4 |
| Database | PostgreSQL 15 (Prisma ORM) |
| Queue | BullMQ (Redis) |
| Storage | S3 / MinIO |
| Auth | JWT + bcrypt |
| Validation | Zod |
| Logging | Pino |
| Testing | Vitest |

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for infrastructure services)

### Setup

```bash
# Clone and enter the project
cd projects/saas-website-builder

# Install dependencies
npm install

# Start infrastructure (PostgreSQL, Redis, MinIO)
docker compose up -d postgres redis minio

# Copy environment config
cp .env.example .env

# Run database migrations
npm run db:push

# Generate Prisma client
npm run db:generate

# Seed demo data
npm run db:seed

# Start the API server
npm run dev

# In a separate terminal, start the build worker
npm run worker
```

The API will be available at `http://localhost:3002`.

### Create a MinIO bucket

After MinIO starts, create the `site-builds` bucket:

```bash
# Via MinIO Console at http://localhost:9001
# Login: minioadmin / minioadmin
# Create bucket: site-builds
```

## API Reference

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "tenantName": "My Agency",
  "tenantSlug": "my-agency"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@demo-agency.com",
  "password": "demo-password-123"
}
```

Returns a JWT token. Include in subsequent requests:
```
Authorization: Bearer <token>
```

### Sites

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sites` | List sites (paginated) |
| POST | `/api/sites` | Create a new site |
| GET | `/api/sites/:id` | Get site details |
| PUT | `/api/sites/:id` | Update site settings |
| DELETE | `/api/sites/:id` | Delete site |
| POST | `/api/sites/:id/publish` | Trigger build & publish |
| POST | `/api/sites/:id/rollback` | Rollback to previous version |
| GET | `/api/sites/:id/versions` | List all versions |
| GET | `/api/sites/:id/pages` | List pages |
| POST | `/api/sites/:id/pages` | Create a page |
| PUT | `/api/sites/:id/pages/:pageId` | Update page content |
| DELETE | `/api/sites/:id/pages/:pageId` | Delete a page |

### Site Serving

```http
GET /serve/:subdomain          # Serves homepage
GET /serve/:subdomain/about    # Serves /about page
```

### Health Check

```http
GET /api/health
```

## Page Content Structure

Pages use a structured JSON format representing visual editor output:

```json
{
  "sections": [
    {
      "type": "hero",
      "props": {
        "heading": "Welcome",
        "subheading": "A brief description",
        "ctaText": "Learn More",
        "ctaLink": "/about",
        "alignment": "center"
      }
    },
    {
      "type": "features",
      "props": {
        "heading": "What We Do",
        "columns": 3,
        "items": [
          { "icon": "code", "title": "Development", "description": "..." },
          { "icon": "palette", "title": "Design", "description": "..." }
        ]
      }
    }
  ]
}
```

**Supported section types**: `hero`, `text`, `features`, `cards`, `image`, `cta`

## Testing

```bash
npm test              # Run tests once
npm run test:watch    # Watch mode
```

## Deployment

### Docker

```bash
# Build and run everything
docker compose up --build

# Or build just the app image
docker build -t saas-website-builder .
```

### Production Considerations

- Set a strong `JWT_SECRET` (at least 32 characters)
- Use a managed PostgreSQL instance
- Use a managed Redis instance (e.g., ElastiCache)
- Use AWS S3 or compatible storage with proper IAM roles
- Set `CDN_BASE_URL` for serving assets via CloudFront or similar
- Configure `NODE_ENV=production` for optimized logging and error messages
- Scale workers independently based on build queue depth

## Project Structure

```
src/
├── index.ts                 # Express server entry point
├── api/
│   ├── middleware/
│   │   ├── auth.ts          # JWT authentication
│   │   └── errorHandler.ts  # Global error handling
│   └── routes/
│       ├── auth.ts          # Registration & login
│       ├── sites.ts         # Site CRUD, publishing, rollback
│       ├── serve.ts         # Built site serving
│       └── health.ts        # Health check
├── services/
│   ├── build-engine.ts      # Core build pipeline
│   ├── renderer.ts          # JSON → HTML rendering
│   └── site-resolver.ts     # Subdomain → S3 resolution
├── workers/
│   ├── index.ts             # BullMQ worker entry point
│   └── build-processor.ts   # Build job processor
├── lib/
│   ├── config.ts            # Environment configuration
│   ├── logger.ts            # Pino logger
│   ├── prisma.ts            # Prisma client singleton
│   ├── redis.ts             # Redis connection
│   ├── s3.ts                # S3 client & operations
│   └── errors.ts            # Custom error classes
└── types/
    └── index.ts             # TypeScript type definitions
```
