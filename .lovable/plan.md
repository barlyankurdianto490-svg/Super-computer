

# Plan: Comprehensive System Revision — Super Computer Apps

## Overview
Align the entire application with the detailed specification provided. This involves changes to ticket format, registration flow (Owner role with OTP), dashboard with live stats, order creation wizard refinements, order detail workflow updates, sidebar role-based visibility, and branding updates ("Super Computer" instead of "Duper Computer").

---

## 1. Database Changes

**Migration — Update ticket number format:**
- Replace `generate_ticket_number()` function: new format `A-XXX` where `A` = first letter of month name (J=Jan, F=Feb, M=Mar, A=Apr, etc.), `XXX` = sequential starting from 001 per month
- Add `owner` to `app_role` enum
- Add `cancel_type` column to `service_updates` (text, nullable) — stores "Cancel by Customer" or "Cancel by Super Komputer"
- Add `edited_by` and `edited_at` columns to `service_orders` (text/timestamp, nullable) — tracks edit history
- Remove `pending` from status flow (spec says: Diterima → Diagnosa → Menunggu Konfirmasi → Perbaikan → Selesai → Siap diAmbil → Close)
- Add `ready_for_pickup` status concept (mapped as a new status value)

**Note:** The month-letter mapping has ambiguity (J=Jan/Jun/Jul, M=Mar/May, A=Apr/Aug). Will use: J=Jan, F=Feb, M=Mar, A=Apr, Y=May, U=Jun, L=Jul, G=Aug, S=Sep, O=Oct, N=Nov, D=Dec.

---

## 2. Registration Page — Add Owner Role with OTP

**File: `src/pages/RegisterPage.tsx`**
- Add "Owner" as a third role option
- When Owner is selected, show OTP verification step:
  - Backend edge function sends OTP code to `bambanghrmko@gmail.com`
  - User must enter the OTP to complete registration
  - Owner accounts are auto-approved (like current admin)
- Admin and Technician roles require Owner approval (not admin approval)

**New edge function: `supabase/functions/send-owner-otp/index.ts`**
- Generates a 6-digit OTP, stores it temporarily, sends email to the hardcoded address
- Validates OTP on verification request

---

## 3. Dashboard Home — Live Stats from Database

**File: `src/pages/DashboardHome.tsx`**
- Fetch real data from `service_orders`:
  - Total Pesanan (all time)
  - Dalam Proses (status not in completed/closed/cancelled)
  - Selesai (this month)
  - Belum diupdate 24jam (orders where `updated_at` < 24 hours ago and status not final)
- Fetch active technician count from `profiles` where `is_approved = true` and `requested_role = technician`
- Show recent orders list (latest 10)
- Show notification-style list of recent `service_updates`

---

## 4. Create Order Page — Wizard Refinements

**File: `src/pages/CreateOrderPage.tsx`**
- Add "Install" as 4th service type option
- Step 2: Add "Search" button to look up remembered customers from localStorage
- Step 3: Make `device_type` (Jenis Perangkat) and `device_model` (Tipe/Model) mandatory
- Step 4 changes:
  - Add "No Display" and "Cant boot Windows" to condition options, remove "Bluescreen" and "Hang/Freeze"
  - If condition = "Lainnya", make `damage_description` mandatory (currently already required for all — change to only required when "Lainnya")
  - Make photo uploads mandatory (all 4 sides)
  - Make `unit_accessories` (Kelengkapan) mandatory
  - Add "Other" checkbox item with free-text input for custom check
  - If condition = "Lainnya", make cek unit mandatory
  - Make photo labels: Atas, Bawah, Tampilan Terbuka (not Depan/Belakang — per tracking page spec)
  - Separate `notes` into its own optional field
- Remove `estimated_cost` from create form (not in spec)

---

## 5. Order Detail Page — Workflow & Edit

**File: `src/pages/OrderDetailPage.tsx`**
- **Status flow update:** Diterima → Diagnosa → Menunggu Konfirmasi → Perbaikan → Selesai → [Invoice] → Siap diAmbil → Close
  - Remove "Pending" from flow
  - Add "Siap diAmbil" (ready_for_pickup) status after invoice
- **Cancel restrictions:** Cancel button NOT available when status is Selesai, Siap diAmbil, or Close
- **Cancel dialog:** When pressing Cancel, show a popup with:
  - Radio: "Cancel by Customer" or "Cancel by Super Komputer"
  - Textarea: Alasan (mandatory)
- **Invoice flow:** After invoice is saved → status becomes "Siap diAmbil" (not "closed")
- **Edit feature:** Add Edit button to modify Steps 1-3 data (service type, customer info, unit details) — NOT step 4/5
  - On save, record "Diedit oleh [user], waktu [timestamp]" in `edited_by`/`edited_at`
- **Show edit history** if `edited_by` is set

---

## 6. Sidebar — Role-Based Visibility

**File: `src/components/DashboardLayout.tsx`**
- "Kelola Teknisi" menu item only visible when logged in as Owner role
- Rename menu label to "Kelola User"
- Use `useAuth()` to check role

---

## 7. Technicians/Users Page — Owner Only

**File: `src/pages/TechniciansPage.tsx`**
- Only accessible by Owner role (add guard)
- Owner can approve/reject both Admin and Technician accounts

---

## 8. Branding Update

- Replace all "Duper Computer" references with "Super Computer" across all files
- Update Index.tsx footer, nav, WhatsApp messages, etc.

---

## 9. Ticket Format on Index.tsx

**File: `src/pages/Index.tsx`**
- Update search logic: ticket format is now `A-XXX` (single letter + dash + numbers)
- Detect ticket vs phone: if input matches `^[A-Z]-` pattern → ticket search, else → phone search

---

## 10. Tracking Page Updates

**File: `src/pages/TrackingPage.tsx`**
- Update status flow to match new sequence (remove pending, add ready_for_pickup)
- Photo labels: Atas, Bawah, Tampilan Terbuka
- Add "Other" to unit checks display
- Show cancel type (by Customer / by Super Komputer) in cancelled state

---

## Files to Create/Modify

| File | Action |
|------|--------|
| DB Migration | New migration for schema + function changes |
| `supabase/functions/send-owner-otp/index.ts` | Create — OTP email for Owner registration |
| `src/pages/RegisterPage.tsx` | Major revision — add Owner role + OTP |
| `src/pages/DashboardHome.tsx` | Rewrite — live stats + recent orders |
| `src/pages/CreateOrderPage.tsx` | Revise — mandatory fields, Install type, Other check |
| `src/pages/OrderDetailPage.tsx` | Revise — new flow, cancel dialog, edit feature |
| `src/pages/OrdersPage.tsx` | Minor — branding, labels |
| `src/pages/Index.tsx` | Revise — ticket format detection, branding |
| `src/pages/TrackingPage.tsx` | Revise — new status flow, cancel type display |
| `src/pages/TechniciansPage.tsx` | Minor — owner-only guard |
| `src/components/DashboardLayout.tsx` | Revise — role-based menu, branding |
| `src/hooks/useAuth.tsx` | Update — handle `owner` role |

---

## Implementation Order

1. Database migration (new columns, updated function, enum)
2. Edge function for Owner OTP
3. Auth & Registration updates
4. Dashboard Layout (role-based sidebar)
5. Dashboard Home (live stats)
6. Create Order Page (wizard refinements)
7. Order Detail Page (workflow, cancel dialog, edit, invoice flow)
8. Tracking Page & Index Page updates
9. Branding sweep (Super Computer)

