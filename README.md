# Supplier Registration Tracker

Live dashboard for supplier registration status. Built with Next.js 14 (App Router), Tailwind CSS, Lucide, Recharts and Supabase (Postgres + Realtime). Deploys to Vercel.

## Project structure

```
SupplierReg/
├── app/
│   ├── layout.tsx              # Root layout: font, AppShell, toast host
│   ├── globals.css             # Tailwind + glass/btn/input component classes
│   ├── page.tsx                # Dashboard: search, filters, sort, table, modal, delete
│   └── analytics/page.tsx      # KPI cards + bar / donut / area charts
├── components/
│   ├── AppShell.tsx            # Desktop sidebar + mobile drawer
│   ├── RegistrationTable.tsx   # Sortable table, inline row edit, mobile cards
│   ├── RegistrationForm.tsx    # Create/edit form with field-level validation
│   ├── Modal.tsx               # Accessible dialog (focus trap, Esc, scroll lock)
│   ├── ConfirmDialog.tsx       # Delete confirmation
│   ├── ExcelExportButton.tsx   # Fetches fresh rows → formatted .xlsx
│   ├── StatusBadge.tsx         # Status pill + colour/icon map
│   ├── LiveIndicator.tsx       # Realtime connection pill
│   └── States.tsx              # Loading / error / empty states
├── lib/
│   ├── supabase.ts             # Browser Supabase client (singleton)
│   ├── useRegistrations.ts     # Fetch + Realtime sync + CRUD hook
│   ├── validation.ts           # Form validation (mirrors DB CHECK constraints)
│   ├── types.ts                # Registration type, STATUSES
│   ├── format.ts               # Money/date formatting
│   └── chartTheme.ts           # Validated chart colours, light + dark
├── supabase/
│   ├── schema.sql              # Table, trigger, RLS, Realtime
│   └── seed.sql                # Row(s) from Supplier_Registration_Status.xlsx
└── .env.local.example
```

## 1. Supabase setup

1. Create a project at <https://supabase.com/dashboard>.
2. **SQL Editor → New query**, paste [supabase/schema.sql](supabase/schema.sql), **Run**. It creates the table, an `updated_at` trigger, RLS policies, and adds the table to the `supabase_realtime` publication. It's safe to run again.
3. Optional: run [supabase/seed.sql](supabase/seed.sql) to import the row from the spreadsheet.
4. Check **Database → Publications → supabase_realtime** lists `supplier_registrations`.

> **Security note.** The policies let the `anon` role read *and write*, because the app has no login. Anyone with the site URL can change data. Before sharing the URL more widely, add Supabase Auth and limit the insert/update/delete policies to `authenticated` (see the comment in `schema.sql`).

## 2. Run locally

```powershell
Copy-Item .env.local.example .env.local   # then paste your URL + anon key
npm install
npm run dev                                # http://localhost:3000
```

Keys are under **Project Settings → API**: *Project URL* and the *anon public* key. Never use the `service_role` key in this app; every `NEXT_PUBLIC_` variable ships to the browser.

> This folder is inside OneDrive. Syncing `node_modules` and `.next` makes installs and builds very slow. Exclude them from sync, or move the project to a folder outside OneDrive, e.g. `C:\dev\SupplierReg`.

## 3. Deploy to Vercel

1. Push the project to a GitHub/GitLab/Bitbucket repo (`.gitignore` already excludes `.env.local`).
2. In Vercel, **Add New → Project**, import the repo. The framework preset (Next.js) is detected automatically. Leave the build settings at their defaults.
3. Before the first deploy, open **Environment Variables** and add both variables for **Production, Preview and Development**:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |

   Alternative: **Vercel → Integrations → Supabase** links the project and injects these variables for you.
4. Deploy. `NEXT_PUBLIC_*` values are baked in at build time, so **after changing them you need to redeploy** (Deployments → ⋯ → Redeploy).
5. Smoke test on the live URL: the status pill shows **Live**, the seeded row appears, and the Excel download works.
6. Optional: in Supabase, **Authentication → URL Configuration**, add the Vercel domain (needed once you add Auth).

### Deployment checklist

- [ ] `schema.sql` ran without errors
- [ ] Table is in the `supabase_realtime` publication
- [ ] Both env vars are set for every Vercel environment
- [ ] Redeployed after the env vars were set
- [ ] The live site shows **Live**, not **Offline** / "not configured"
- [ ] Create, edit and delete each work on the production URL
- [ ] Excel downloads and opens in Excel
- [ ] You've decided whether public write access is acceptable (see the security note)

## 4. QA & test protocol

Run against a Preview deployment or `npm run dev`. Use two browsers (A and B), e.g. Chrome and Edge, or one normal window and one incognito window.

### Persistence
| # | Steps | Expected |
|---|---|---|
| P1 | Create a record with every field filled, then hard-reload | The record is still there with identical values |
| P2 | Edit the fee to `1234.5` and reload | Shows `LKR 1,234.50` |
| P3 | Delete a record and reload | The record is gone |
| P4 | Check the row in Supabase Table Editor after an edit | `updated_at` is later than `created_at` |
| P5 | Create a record with only Institute filled | Saves. Fees are 0, dates are "—", status is Pending |

### Real-time sync
| # | Steps | Expected |
|---|---|---|
| R1 | Create in A | Appears in B within ~1s, with a green row flash and no reload |
| R2 | Inline-edit the status in B | A updates. The Analytics page in A updates its KPIs and charts |
| R3 | Delete in A | Disappears from B |
| R4 | Edit a row directly in Supabase Table Editor | Both browsers update |
| R5 | Go offline in DevTools → Network for 30s, have B make changes, then go back online | The pill shows Offline, then Live, and the list catches up (it re-fetches when the channel re-subscribes) |
| R6 | Open the same row in A and B, save in A, then save in B | The last write wins. Neither browser errors |

### Validation
| # | Input | Expected |
|---|---|---|
| V1 | Institute empty | "Institute is required." Nothing is saved |
| V2 | Fee `-5` | "Can't be negative." |
| V3 | Fee `abc` | "Enter a number." |
| V4 | Fee `1,500` | Accepted as 1500 |
| V5 | Remarks longer than 1000 characters | The input stops at 1000 |
| V6 | Inline edit: clear Institute and press Enter | The field turns red, a toast explains why, and the row stays in edit mode |
| V7 | Inline edit: press Esc | Values revert and nothing is saved |
| V8 | Bypass the UI: `insert` with `status='Done'` via SQL | Rejected by the CHECK constraint |

### Search, filter, sort
| # | Steps | Expected |
|---|---|---|
| S1 | Search "kandy" (any case) | Matches the institute |
| S2 | Search a word from Remarks or the payment method | Matches |
| S3 | Choose the Pending chip | Only Pending rows show. Chip counts match the totals |
| S4 | Click "Reg. fee" twice | Sorts ascending, then descending. Empty dates always sort last |
| S5 | Filter so nothing matches | The "No matches" state with "Clear filters" appears |

### Responsive UI & accessibility
| # | Steps | Expected |
|---|---|---|
| U1 | 375px wide (iPhone SE) | A hamburger opens the drawer, the table becomes cards, the modal becomes a bottom sheet, nothing scrolls sideways |
| U2 | 768px and 1280px+ | The table shows and the sidebar is pinned from 1024px |
| U3 | Use the keyboard only | Tab reaches every control. The modal traps focus, Esc closes it, and focus returns to the trigger |
| U4 | OS dark mode | Every surface and chart switches with readable contrast |
| U5 | Reduce motion turned on in the OS | Animations are effectively disabled |
| U6 | Charts → "View as table" | The table data matches the chart |

### Excel export
| # | Steps | Expected |
|---|---|---|
| E1 | Click "Download Latest Excel" on the dashboard and on Analytics | Downloads `Supplier_Registration_Status_Export.xlsx` |
| E2 | Open it in Excel | A "Registrations" sheet with headers, autofilter and column widths, plus a "Summary" sheet |
| E3 | Date cells | Real Excel dates (`dd-mmm-yyyy`) that sort properly and haven't shifted by a day |
| E4 | Money cells | Numbers formatted `#,##0.00`. SUM works on them |
| E5 | Edit a row in B, then export from A without reloading | The file contains B's change (the export always re-queries the database) |
| E6 | Export with 0 rows | A valid file with only the header row |
| E7 | Point it at a bad Supabase URL and export | A clear error toast, not a broken file |

### Build gates
```powershell
npm run typecheck
npm run lint
npm run build
```
