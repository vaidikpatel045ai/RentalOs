# Bridal Rental OS

The operating system for bridal and formalwear rental boutiques — bookings, garment lifecycle, tailoring, cleaning, delivery and customer management in one connected system.

This repo currently implements **Phase 1 (Foundation)** and **Phase 2 (Core Operations)** of the full product spec, on top of a complete data model covering every later phase. See `/marketing/video-script.md` for the product's marketing video brief.

## Stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui · PostgreSQL · Prisma 6 · Auth.js v5 (Credentials + JWT) · React Hook Form + Zod · Recharts

## Getting Started

1. **Install dependencies** (already done if you're reading this from the built repo):
   ```bash
   npm install
   ```

2. **Configure environment** — copy `.env.example` to `.env.local` and fill in a real Postgres connection string:
   ```bash
   cp .env.example .env.local
   ```
   - `DATABASE_URL` — any Postgres instance (local, [Neon](https://neon.tech), [Supabase](https://supabase.com), RDS, etc).
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`.

3. **Run the migration and seed demo data**:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
   The seed script wipes and repopulates all tables with a realistic UAE bridal boutique dataset (3 branches, staff across every role, ~30 customers, ~30 garments, bookings, appointments, tailoring/cleaning jobs) including the connected "Sarah Ahmed / BR-102" lifecycle story used in the marketing video.

4. **Run the app**:
   ```bash
   npm run dev
   ```

## Demo Logins

All seeded accounts use the password `Password123!`.

| Role | Email |
|---|---|
| Owner | `owner@bridalrentalos.ae` |
| Manager (Dubai) | `manager.dxb@bridalrentalos.ae` |
| Sales (Dubai) | `sales.dxb@bridalrentalos.ae` |
| Stylist (Dubai) | `stylist.dxb@bridalrentalos.ae` |
| Tailor (Dubai) | `tailor.dxb@bridalrentalos.ae` |
| Cleaner (Dubai) | `cleaner.dxb@bridalrentalos.ae` |
| Delivery (Dubai) | `delivery.dxb@bridalrentalos.ae` |
| Customer | `sarah.ahmed@example.com` |

## What's Built

- **Foundation**: Auth.js credentials login, RBAC (`lib/permissions.ts`), role-aware dashboard shell with sidebar/topbar/command search (⌘K), luxury design system (`app/globals.css`).
- **Customers**: profile, versioned measurements, booking/appointment history.
- **Inventory**: garment CRUD, photo uploads, QR codes, full status history.
- **Bookings**: multi-garment booking wizard with a live **availability engine** (`lib/availability-engine.ts`) that classifies every proposed rental as SAFE / TIGHT / UNSAFE based on configurable cleaning/repair/inspection buffers — the core "can I safely book this?" intelligence from the product spec. Double-booking is prevented both at the UI (advisory) and inside a serializable DB transaction (authoritative).
- **Appointments & Calendar**: month calendar overlaying appointments, pickups and returns.
- **Owner/Manager dashboards**: live KPIs (today's appointments/pickups/returns, alterations & cleaning due, pending payments, deposits held, revenue, utilization, ROI) and an **At Risk** panel surfacing tight/unsafe turnarounds automatically.
- **Tailor / Cleaner / Delivery / Customer portals**: minimal but real, role-scoped views wired to the same underlying job/status models (full dedicated portal UIs are a later phase).

## What's Deferred

Full payments/damage-inspection/cleaning-workflow UIs, ROI & dead-stock analytics, WhatsApp integration, package builder, multi-branch transfer flows, and the full marketing site — all already modeled in `prisma/schema.prisma` so building them later is additive, not a rework.

## US-Readiness

Despite the UAE-first demo data, nothing is hardcoded to AED/UAE at the architecture level: currency, tax rate/label, timezone and locale all live on `Branch`, money always renders through `lib/currency.ts`, and addresses/phone numbers use generic international formats. Adding a US branch later is a data change, not a code change.
