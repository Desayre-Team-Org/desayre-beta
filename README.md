# DESAYRE PLATFORM

A private internal AI media generation platform deployed on Vercel.

## Overview

DESAYRE is a production-ready internal AI generation studio that creates:
- Ultra-realistic images from text prompts
- Image edits and variations
- Videos from images

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes (Serverless + Edge)
- **Database**: PostgreSQL (Neon or Supabase)
- **Storage**: Cloudflare R2
- **Queue**: Upstash Redis
- **Auth**: JWT-based session

### AI Providers
- **ModelsLabs**: Nano Banana Pro (image generation), Grok Imagine Edit (image editing)
- **xAI**: Grok Imagine Video (video generation)

## Project Structure

```
desayre-platform/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   ├── generate/       # Generation endpoints
│   │   │   ├── history/        # History/fetch generations
│   │   │   ├── admin/          # Admin endpoints
│   │   │   └── worker/         # Queue worker
│   │   ├── login/              # Login page
│   │   ├── studio/             # Main generation interface
│   │   ├── images/             # Image history
│   │   ├── videos/             # Video history
│   │   ├── admin/              # Admin dashboard
│   │   ├── settings/           # Settings page
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Root redirect
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── ui/                 # UI components
│   │   ├── layout/             # Layout components
│   │   └── studio/             # Studio-specific components
│   ├── lib/
│   │   ├── ai/                 # AI-related code
│   │   │   ├── providers/      # AI provider implementations
│   │   │   ├── systemPromptEngine.ts  # Prompt encoder
│   │   │   └── router.ts       # Model router
│   │   ├── db/                 # Database
│   │   ├── queue/              # Redis queue
│   │   ├── auth/               # Authentication
│   │   ├── storage/            # R2 storage
│   │   └── utils/              # Utilities
│   ├── hooks/                  # React hooks
│   └── types/                  # TypeScript types
├── drizzle/                    # Database migrations
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env.example
```

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Storage (Cloudflare R2)
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_URL=""

# Auth
JWT_SECRET="your-super-secret-key"
ADMIN_PASSWORD_HASH=""

# AI APIs
MODELS_LABS_API_KEY=""
XAI_API_KEY=""

# App
NEXT_PUBLIC_APP_URL="https://your-domain.com"
WORKER_SECRET="optional-worker-auth"
```

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Run database migrations**:
   ```bash
   npm run db:migrate
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

## Key Features

### System Prompt Encoder
The platform includes an intelligent prompt encoding engine that:
- Enhances raw user prompts
- Adds cinematic realism tags
- Optimizes for photorealism
- Maintains internal style consistency

### Async Generation Flow
1. User submits generation request
2. Job is added to Redis queue
3. Worker processes jobs asynchronously
4. Results are stored in R2 and database
5. User receives completion notification

### Queue System
- Supports retries with exponential backoff
- Dead letter queue for failed jobs
- Priority-based job processing

## Deployment

### Vercel
1. Connect your repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy

### Database Setup (Neon)
1. Create a new PostgreSQL database
2. Copy connection string to `DATABASE_URL`
3. Run migrations

### Redis Setup (Upstash)
1. Create an Upstash Redis database
2. Copy REST URL and token to environment variables

### Storage Setup (Cloudflare R2)
1. Create an R2 bucket
2. Create API tokens with read/write access
3. Configure environment variables

## Security

- JWT-based authentication
- HTTP-only cookies
- Rate limiting (implement via middleware)
- Admin-only routes protected
- API key encryption (store hashed)

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Generation
- `POST /api/generate/image` - Generate image
- `POST /api/generate/edit` - Edit image
- `POST /api/generate/video` - Generate video

### History
- `GET /api/history` - List generations

### Admin
- `GET /api/admin/stats` - Get system stats

### Worker
- `POST /api/worker` - Process queue jobs
- `GET /api/worker` - Get queue status

## License

Private internal use only.
