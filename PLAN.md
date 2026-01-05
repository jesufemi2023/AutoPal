# AutoPal NG - Production Roadmap

## Phase 1: Modular Scaffolding [COMPLETED]
- [x] Defined strict domain folder structure.
- [x] Implemented environment-driven configuration via `envService`.
- [x] Established Zustand store placeholders for all core features.
- [x] Setup `.env.example` for local and production parity.

## Phase 2: Core Intelligence (Logic Engine) [COMPLETED]
- [x] Implemented Core SQL Schema (Vehicles, Fuel Logs, Service Logs).
- [x] Enabled Row-Level Security (RLS) for data isolation.
- [x] Defined TypeScript interfaces for database synchronization.
- [x] **New: Created Supabase Deployment Guide (`SUPABASE_GUIDE.md`)**.
- [x] Applied SQL Migrations to Supabase instance.
- [ ] Implement deterministic maintenance calculators (mileage-based rules).
- [ ] Offline-first persistence via Dexie.

## Phase 3: AI Orchestration
- [ ] Gemini 3 Flash/Pro integration for JIT diagnostics.
- [ ] Multi-modal vision support for part identification.

## Phase 4: UI/UX & Lifecycle
- [ ] Onboarding flows and vehicle digital twin initialization.
- [ ] Marketplace integration and WhatsApp routing.
- [ ] Payment gateway stubs for premium tiers.
