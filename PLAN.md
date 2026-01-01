# AutoPal NG - Production Readiness Roadmap

## 1. Design Principles
- **Maintainability**: Clear JSDoc comments on all services and stores.
- **Scalability**: Stateless React components coupled with Supabase for real-time data.
- **Cost-Efficiency**: JIT AI calls (Flash 3.0) to stay within the $70 annual budget.
- **Security**: OAuth 2.0 via Supabase with strict URL fragment validation.

## 2. Technical Decisions
- **Zustand**: Used for globally reactive UI state (session, vehicles, tasks).
- **Supabase**: Primary source of truth for Auth and persistence.
- **Gemini**: Event-driven diagnostic engine (Just-in-Time execution).
- **Tailwind**: Utility-first CSS for high-fidelity, responsive UI.

## 3. Maintenance Guide
- To update AI models, modify `services/geminiService.ts`.
- To adjust branding colors, update the `tailwind.config` (simulated via CDN in index.html).
- To manage permissions, update `metadata.json`.
