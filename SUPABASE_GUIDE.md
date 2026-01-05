# Supabase Infrastructure Guide for AutoPal NG

This guide provides step-by-step instructions to configure your Supabase backend to support the AutoPal NG vehicle intelligence platform.

## 1. Local CLI Setup

The most robust way to manage your schema is via the Supabase CLI.

### Installation
```bash
# Using npm
npm install -g supabase

# Or using Homebrew (macOS)
brew install supabase/tap/supabase
```

### Authentication
```bash
supabase login
```
This will open your browser to authorize the CLI.

## 2. Initialize and Link Project

In the root of your project directory:

```bash
# Initialize Supabase configuration
supabase init

# Link to your remote project (get reference ID from project settings)
supabase link --project-ref your-project-ref-id
```

## 3. Applying the Schema

You have two options to apply the database structure.

### Option A: Via Dashboard (Recommended for MVP)
1. Go to your [Supabase Dashboard](https://supabase.com).
2. Navigate to **SQL Editor**.
3. Create a **New Query**.
4. Paste the contents of `supabase/migrations/20240521_core_schema.sql`.
5. Click **Run**.

### Option B: Via CLI
```bash
# Push your local migrations to the remote database
supabase db push
```

## 4. Storage Configuration

For vehicle images, you need to create a storage bucket:

1. Go to **Storage** in the Supabase Dashboard.
2. Click **New Bucket**.
3. Name it `vehicle-images`.
4. Set it to **Public** (or configure specific RLS policies if you prefer private buckets with signed URLs).

## 5. Environment Synchronization

Ensure the following variables in `index.html` (or your `.env` file) match your new project:

- `SUPABASE_URL`: Found in Project Settings > API.
- `SUPABASE_ANON_KEY`: Found in Project Settings > API (use the `anon` `public` key).

## 6. Understanding RLS

Row Level Security (RLS) is enabled for all tables.
- **Vehicles**: Restricted by the `owner_id` column matching `auth.uid()`.
- **Logs & Tasks**: Restricted by a subquery that checks if the parent `vehicle_id` belongs to the authenticated user.

This ensures that even in a multi-tenant environment, users can never see each other's data.