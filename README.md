# SubFlow - Subscription Management System

SubFlow is an enterprise-grade multi-role subscription management application built with **React, Vite, JavaScript (JSX), Tailwind CSS, Supabase PostgreSQL, Supabase Auth, and Supabase Edge Functions**.

---

## Architecture & Tech Stack

- **Frontend:** React 19, Vite 8, JavaScript (JSX), React Router 7, Tailwind CSS v4, Lucide React, Sonner Toasts
- **Database:** Supabase PostgreSQL with Row-Level Security (RLS) & Triggers
- **Authentication:** Supabase Auth with secure role-based access control (RBAC)
- **Serverless Backend:** Supabase Edge Functions (Deno / TypeScript) for privileged staff invitations

---

## Roles & Dashboards

1. **Administrator (`/admin`)**
   - Live metrics: Total Staff, Total Customers, Active Subscriptions (placeholder), Total Revenue (placeholder).
   - Staff directory with name/email search, role badges, creation dates, and active account status.
   - Secure staff invitations powered by the `invite-staff` Supabase Edge Function.
   - Unfinished modules with professional Coming Soon states (Products, Plans, Subscriptions, Invoices, Settings).

2. **Staff (`/staff`)**
   - Personal welcome banner & operational metrics.
   - Staff identity & authorization summary.
   - Functional profile management section (`/staff/profile`) with display name updates.
   - Restricted access: Staff members are prevented from accessing admin routes or staff management.
   - Coming Soon states for Customers, Quotations, Subscriptions, and Invoices.

3. **Customer (`/customer`)**
   - Self-service dashboard with subscription plan status and billing details.
   - Subscriber profile information (name, email, company, phone, account creation date).
   - Functional Account Settings section (`/customer/settings`) to update profile and company information.
   - Strong data isolation via PostgreSQL Row-Level Security (RLS).
   - Coming Soon states for My Subscriptions, My Invoices, and Payment History.

---

## Quick Start (Frontend)

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Provide your Supabase URL and Anon Key:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Run Development Server:**
   ```bash
   npm run dev
   ```

4. **Production Build:**
   ```bash
   npm run build
   ```

---

## Database Migrations & Edge Functions

All SQL migrations and Edge Function code are organized under `supabase/`:
- `supabase/migrations/01_initial_schema.sql`
- `supabase/migrations/02_admin_provisioning.sql`
- `supabase/functions/invite-staff/index.ts`

Refer to the deployment instructions in the implementation report or SQL editor to run the migrations.
