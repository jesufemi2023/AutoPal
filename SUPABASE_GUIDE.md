# Supabase Infrastructure Deployment Guide

This document outlines the professional workflow for deploying the **AutoPal NG** backend infrastructure.

## 1. Local CLI Environment Setup

The Supabase CLI is the industry standard for managing schema migrations version-controlled in your repository.

### Installation
```bash
# Using npm
npm install -g supabase

# Verify installation
supabase --version
```

### Initialization
Log into your Supabase account and link your local repository to your cloud project.
```bash
# Authenticate
supabase login

# Initialize local configuration
supabase init

# Link to remote project
# You can find the reference ID in your project dashboard URL: 
# https://supabase.com/dashboard/project/<PROJECT_REF_ID>
supabase link --project-ref <PROJECT_REF_ID>
```

## 2. Deploying the Schema Migration

We use a declarative migration approach. The migration file is located at `supabase/migrations/20240521_core_schema.sql`.

### Option A: Local CLI Push (Automated)
This is the preferred method for production environments.
```bash
# Push migrations to your linked project
supabase db push
```

### Option B: SQL Editor (Manual)
If you do not have CLI access, use the web dashboard:
1. Open the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** (icon on the left sidebar).
3. Click **New Query**.
4. Copy the entire content of `supabase/migrations/20240521_core_schema.sql`.
5. Paste and click **Run**.

## 3. Row Level Security (RLS) Configuration

Security is baked into the migration script, but here is how it works:

- **Isolation**: Every table has `ENABLE ROW LEVEL SECURITY` applied.
- **Ownership**: The `vehicles` table checks `auth.uid() = owner_id`.
- **Relational Integrity**: `fuel_logs`, `service_logs`, and `maintenance_tasks` use a subquery check:
  ```sql
  USING (vehicle_id IN (SELECT id FROM vehicles WHERE owner_id = auth.uid()))
  ```
  This ensures that even if someone knows a UUID for a vehicle they don't own, they cannot read its logs.

## 4. Storage Bucket Setup

To store vehicle images (Chassis photos or diagnostics):

1. Go to **Storage** in your Supabase Dashboard.
2. Create a new bucket named `vehicle-images`.
3. **Important**: While the bucket can be "Public" for easy access, the app is designed to work with individual RLS policies on the `objects` table if you require strict privacy. For MVP, keeping it Public is sufficient as filenames are randomized UUIDs.

## 5. Environment Synchronization

Update your `index.html` or `.env` file with the following keys from **Project Settings > API**:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Once completed, the application will automatically synchronize your garage data to the cloud whenever you are online.