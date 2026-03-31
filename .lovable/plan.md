

# Plan: Overhaul Ticket Creation System & Unified Tracking Search

## Overview
Rebuild the ticket creation form as a multi-step wizard with detailed unit intake fields, add photo upload via storage bucket, implement preview-before-submit, and merge the public tracking search into a single input field that accepts both ticket number and phone number.

---

## Database Changes

**Migration 1 — Add new columns to `service_orders`:**
- `customer_email` (text, nullable) — optional email
- `device_password` (text, nullable) — device PIN/password
- `unit_condition` (text, nullable) — e.g. "No Power", "Auto Shutdown"
- `unit_accessories` (text, nullable) — accessories list
- `unit_checks` (jsonb, nullable) — functional check results: `{speaker, camera, touchpad, keyboard, wifi}` each boolean
- Update `service_type` options: `non_warranty`, `warranty_store`, `warranty_partner` (replacing old values)

**Migration 2 — Create storage bucket `unit-photos`:**
- Public bucket for unit photos
- RLS: authenticated users can upload, everyone can read

**Migration 3 — Create `service_photos` table:**
- `id`, `order_id` (uuid), `photo_url` (text), `label` (text — e.g. "atas", "bawah"), `created_at`
- RLS: authenticated insert, public select

---

## Frontend Changes

### 1. New Multi-Step Create Order Page (`src/pages/CreateOrderPage.tsx`)
Replace the current dialog in OrdersPage with a dedicated full-page wizard (4 steps + preview):

**Step 1 — Admin & Service Type:**
- Admin name auto-filled from logged-in user
- Service type: Non Garansi / Garansi Toko / Garansi Partner (radio cards)

**Step 2 — Customer Contact:**
- Checkbox "Ingat data pelanggan" (saves to localStorage)
- Nama (required), No HP (required), Email (optional)
- If remembered, auto-fill from localStorage

**Step 3 — Unit Details:**
- Merk (required)
- Tipe/Model (optional)
- Password/PIN Perangkat (optional, masked input)

**Step 4 — Unit Condition:**
- Kondisi Mati: dropdown/select (No Power, Auto Shutdown, Normal, etc.)
- Foto Unit: 4 upload slots (Atas, Bawah, Depan, Belakang) — upload to storage bucket
- Kelengkapan Unit: text input
- Cek Unit: 5 checkboxes (Speaker, Camera, Touchpad, Keyboard, Wifi) — checked = working

**Step 5 — Preview Page:**
- Summary of all entered data with photos
- Edit button to go back to any step
- **Create** button → inserts to DB, sets status "received", creates first `service_updates` entry

### 2. Update `OrdersPage.tsx`
- Remove the create dialog
- Add "Buat Pesanan" button that navigates to `/dashboard/orders/create`
- Update service type labels to match new values

### 3. Update `OrderDetailPage.tsx`
- Show new fields (email, password, accessories, unit checks, photos)
- Update service type labels

### 4. Unified Public Search (`Index.tsx`)
- Remove Tabs (ticket/phone toggle)
- Single input field that accepts either ticket number or phone number
- Logic: if input starts with "DC-" → treat as ticket, else → search by phone
- Keep same results display

### 5. Update `TrackingPage.tsx`
- Show unit photos if available
- Show unit condition details
- Update service type labels

### 6. Routing (`App.tsx`)
- Add route: `/dashboard/orders/create` → `CreateOrderPage`

---

## Technical Details

- **Photo upload**: Use Supabase Storage SDK (`supabase.storage.from('unit-photos').upload(...)`)
- **Remember customer**: localStorage key `duper_saved_customer` with name/phone/email
- **Unit checks JSON**: `{ speaker: true, camera: false, touchpad: true, keyboard: true, wifi: false }`
- **Service type migration**: Update existing rows from old values to new values, then update code references
- **Preview step**: Pure client-side review before submit, no DB writes until "Create" is pressed

