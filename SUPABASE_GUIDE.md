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

## 3. Row Level Security (RLS) Configuration - Tables

Ensure your tables are secured and policies are active. Run this in the SQL Editor:

```sql
-- 1. Enable RLS on all core tables
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;

-- 2. Vehicle Table Policies (CRUD)
CREATE POLICY "Users can manage their own vehicles"
ON vehicles FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- 3. Maintenance Tasks Policies (Relational CRUD)
CREATE POLICY "Users can manage tasks for their vehicles"
ON maintenance_tasks FOR ALL
TO authenticated
USING (vehicle_id IN (SELECT id FROM vehicles WHERE owner_id = auth.uid()))
WITH CHECK (vehicle_id IN (SELECT id FROM vehicles WHERE owner_id = auth.uid()));

-- 4. Service Logs Policies (Relational CRUD)
CREATE POLICY "Users can manage logs for their vehicles"
ON service_logs FOR ALL
TO authenticated
USING (vehicle_id IN (SELECT id FROM vehicles WHERE owner_id = auth.uid()))
WITH CHECK (vehicle_id IN (SELECT id FROM vehicles WHERE owner_id = auth.uid()));

-- 5. Fuel Logs Policies (Relational CRUD)
CREATE POLICY "Users can manage fuel records for their vehicles"
ON fuel_logs FOR ALL
TO authenticated
USING (vehicle_id IN (SELECT id FROM vehicles WHERE owner_id = auth.uid()))
WITH CHECK (vehicle_id IN (SELECT id FROM vehicles WHERE owner_id = auth.uid()));
```

## 4. Critical: Storage Bucket & RLS Fix (403 Forbidden)

If you encounter a `403 Forbidden` or `new row violates row-level security policy` error during image upload, you must apply these specific policies to the storage engine:

```sql
-- 1. Ensure the bucket exists and is public for reading
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-images', 'vehicle-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public READ access to images (Anyone can see the car photos via URL)
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'vehicle-images' );

-- 3. Allow authenticated users to UPLOAD (INSERT) to their own folder
-- The app uses the path: userId/vehicleId/filename.jpg
CREATE POLICY "Authenticated Insert Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Allow authenticated users to UPDATE (Overwrite) their own images
CREATE POLICY "Authenticated Update Access"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'vehicle-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Allow authenticated users to DELETE their own images
CREATE POLICY "Authenticated Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'vehicle-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## 5. Environment Synchronization

Update your `index.html` or `.env` file with the following keys from **Project Settings > API**:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Once completed, the application will automatically synchronize your garage data to the cloud whenever you are online.
