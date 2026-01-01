
# AutoPal NG - System Architecture Confirmation

I have reviewed and acknowledged the mandatory constraints and reference architecture for AutoPal NG.

## 1. Constraints Acknowledgment
- **Budget**: $70 annual limit prioritized via aggressive free-tier utilization (Vercel, Supabase, Gemini).
- **Scale**: Architected for 10,000+ users using serverless, stateless frontend and Supabase's scalable Postgres/Edge functions.
- **AI Execution**: "Just-in-Time" event-driven model. AI is triggered by specific user interactions (VIN analysis, symptom checks) to minimize token costs.
- **Security**: No hardcoded secrets. Using `process.env.API_KEY` for Gemini and env-based Supabase configuration.
- **Maintenance**: Zero-ops strategy using managed cloud services.

## 2. Tech Stack Confirmation
- **Frontend**: React 18+ (TS), Tailwind CSS, Zustand for state.
- **Backend**: Supabase (Auth, DB, Edge Functions, Storage).
- **AI**: Google Gemini (Flash Lite used by default).
- **Payments**: Paystack (Integrated via client-side libraries).
- **Hosting**: Vercel (Production-ready serverless deployment).

## 3. Implementation Checklist
- [x] **Core State Management**: Zustand store for vehicle data and user session.
- [x] **Authentication Flow**: Login, Signup, and robust Password Recovery.
- [ ] **Google OAuth Setup**:
    1. Create Project in Google Cloud Console.
    2. Configure OAuth Consent Screen (External).
    3. Create OAuth Client ID (Web App).
    4. Add Supabase Callback URL to Authorized Redirect URIs.
    5. Input Client ID/Secret into Supabase Auth Providers.
- [ ] **AI Service**: Integration with Gemini Flash Lite for "Ownership Intelligence".
- [ ] **Dashboard**: High-performance Tailwind UI for vehicle health monitoring.
- [ ] **Payments**: Subscription logic via Paystack.

*Proceeding with feature refinements.*
