# Dime Quest web panels

React + Vite + Tailwind CSS v4. One app hosts every web panel; each role gets its own route prefix.

| Panel | Route | Status |
|---|---|---|
| Global Admin | `/admin/*` | All 14 modules built on mock data |
| Restaurant Owner (incl. franchise, partner) | `/owner/*` | All 14 modules built on mock data, with outlet switcher |
| Sales Person | `/sales/*` | Dashboard, referrals, earnings, profile and payout; self-signup at `/join` |
| Manager / Biller | `/pos/*` | Billing, live view, orders, online orders, operations, reports, check update, day end, settings |

Chef and Customer apps are Flutter and live elsewhere.

## Run it

```bash
npm install
npm run dev            # http://localhost:5173 → sign-in page with demo accounts
npm run build          # production SPA in dist/
npm run build:preview  # one self-contained HTML file in dist-preview/ (hash routing) for sharing demos
```

## Sign-in and demo accounts

`/login` is the real sign-in screen (email and password) plus a list of demo accounts until the auth API exists.
Each role lands on its own panel; other panels redirect it home.

| Account | Role | What it shows |
|---|---|---|
| Ankit Desai | Global Admin | Admin panel |
| Gururaj Kulkarni | Owner, Hotel Annapurna | Franchise with 5 outlets (one suspended), Enterprise plan, outlet switcher |
| Sunita Kulkarni | Owner partner, Hotel Annapurna | Same, without Access management |
| Basavaraj Angadi | Owner, Basavaraj Khanavali | Single outlet on Starter: only the Starter modules appear |
| Raghu N | Manager, Hotel Annapurna Gokul Road | Full biller panel plus Settings, which the owner granted him |
| Lata S | Biller, Hotel Annapurna Gokul Road | Billing, live view, orders, online orders (biller defaults) |
| Sneha Kulkarni | Sales person, code DQ-SNEHA24 | Referral history with paid, approved and waiting incentives |

## Owner self-registration (`/register`)

1. **Your details:** owner name, mobile verified by OTP (demo code `123456` until MSG91 is connected), email,
   password, restaurant name, single outlet or franchise with outlet count, cuisine, city, address, plan.
   Plans too small for the outlet count are locked.
2. **Documents and referral:** GSTIN and FSSAI numbers (format-checked), required documents
   (5 for a single outlet, 7 for a franchise; PDF/JPG/PNG up to 5 MB), optional sales person referral code
   checked against existing codes, terms.
3. **Submitted:** application number and status. The registration lands in Admin › Approvals as Pending;
   approving it emails login details and makes the referral incentive eligible.

## Sales partners

- **Signup (`/join`):** name, mobile with OTP, email, city, password. No approval: the account is active at once
  and a unique code (`DQ-` + first name + 2 digits) is shown and sent by SMS.
- **Invite link:** `/register?ref=CODE` opens owner registration with the code filled in and an "Invited by" note.
- **Panel:** dashboard with code, copy/WhatsApp share and totals; referrals with a status timeline per restaurant
  (registered → approved by Dime Quest → approved for payout → paid with bank reference); earnings with upcoming
  payouts and payout history; profile with UPI or bank (IFSC-checked) payout details and PAN.
- Registrations, sales people and incentive status are shared state, so the admin approving a restaurant or
  marking an incentive paid shows up in the partner's panel immediately.

## Manager / Biller panel

One panel for both; the role and what the owner grants decide which modules appear.

| Module | What it does |
|---|---|
| Billing | Menu grid by category (items outside their timing are locked, with an "allow outside hours" override), dine-in with table picker and guests, or takeaway. Send KOT, add items to a running table, discount up to the role's limit or ask the owner, settle by UPI, cash (quick amounts and change) or card, optional WhatsApp bill. Warns when the kitchen printer is down. |
| Live view | Table use and a kitchen board (in the kitchen, ready, served with bill pending) with timers and late orders flagged |
| Orders | Today's orders; request a cancellation or refund from the owner; status of each request |
| Online orders | Swiggy and Zomato: accept within 3 minutes with a ready time, or reject with a reason; mark ready, hand to rider; pause either app |
| Operations | Cash drawer (opening float, cash sales, cash in and out, expected), expenses (auto-approved up to the owner's limit, else sent to the owner), stock count corrections for approval |
| Reports | Today's sales by hour, payment, order type and item, for the outlet or just my bills |
| Check update | Sync menu, prices and settings to the counter; answers to my requests; menu changes by owner or chef |
| Day end | Blocks while orders are open; cash count by note; expected vs counted with a required note for differences; UPI, card and delivery totals; close (and reopen, manager only) |
| Settings | Counter preferences and printer test pages |

Restaurant data (orders, tables, menu, stock, staff, approvals) is shared between the owner and biller panels,
so a biller's request shows up in Owner › Approvals, the owner's decision shows up on the bill, and access the
owner grants in Access management appears in the staff member's sidebar.

Plan features and role defaults live in `context/PlatformContext.jsx`, shared by every panel. Turn a
feature on for a plan in Admin › Plans, sign in as an owner on that plan, and it appears in their sidebar.

## Structure

```
src/
  config/permissions.js       Roles, feature keys + labels, role defaults, resolvePermissions()
  context/AuthContext.jsx     Session + can(feature). Mock admin user until the login API lands
  components/
    layout/                   AppShell, Sidebar (permission-filtered), Topbar, PageHeader
    guards/                   RequirePermission route guard
    ui/                       Button, Badge/StatusBadge, Panel, Avatar, EmptyState, StatStrip,
                              Tabs, DataTable + FilterBar, Form (Field, Input, Select, Textarea,
                              Toggle, Checkbox, SearchInput), Overlay (Drawer, Modal), Toast
    charts/LineChart.jsx      Dependency-free SVG line chart with tooltip + keyboard support
  lib/format.js               INR (₹18.7L style), dates, timeAgo
  context/PlatformContext.jsx Shared state: plan features, role defaults, registrations, sales people, incentives
  pages/Login.jsx             Sign-in for all web panels
  pages/Register.jsx          Owner self-registration, 2 steps + submitted screen
  pages/SalesSignup.jsx       Sales partner self-signup with instant referral code
  panels/sales/               Sales partner panel: useSales hook (stages, totals, payout date), pages
  panels/pos/                 Manager/Biller panel: PosDataContext (orders, KOTs, settle, requests, drawer, day end), pages
  panels/owner/
    nav.js                    Owner sidebar (items outside the plan or role are hidden)
    OwnerPanel.jsx            Routes, live nav badges, suspended-outlet banner
    data/restaurants.js       Restaurant profiles: outlets, menu, stock items
    data/seed.js              Repeatable demo data: orders, tables, bookings, staff, stock, expenses…
    data/OwnerDataContext.jsx Owner store, selected outlet (or All outlets), actions with endpoint notes
    lib/metrics.js            Sales, same-time-last-week, month to date, hourly, item totals
    components/               OutletSwitcher, PickOutlet, OutletTag, labels
    pages/                    One file per module
  panels/admin/
    nav.js                    Sidebar sections; each item carries its feature key
    AdminPanel.jsx            Routes generated from nav; page map per route
    data/records.js           Mock records shaped like API responses
    data/AdminDataContext.jsx In-memory store + actions (approve, reject, suspend, pay incentive…).
                              Each action notes the endpoint it stands in for and writes an audit entry.
    data/mock.js              Dashboard aggregates
    components/               RegistrationReview drawer (used by Dashboard and Approvals)
    pages/                    One file per module
```

## Global Admin modules

| Module | What it does |
|---|---|
| Dashboard | Approval queue first, platform numbers, revenue chart, plan mix, top sales people, recent activity |
| Approvals | Registration list by status; review drawer with details, document checklist and preview, referral; approve (locked until all documents are in) or reject with a reason |
| RMS management | All restaurants, filters, renewals due, change plan, suspend/reactivate with reason |
| Franchises | Brands with their outlets, managers and sales today; suspend a single outlet |
| User management | Everyone who can sign in, by user type; invite admin users; suspend; password reset |
| Roles and access | Default features per restaurant role and per admin team role, with save/discard |
| Plans | Plan prices and limits; features-by-plan matrix; create/edit plans |
| Sales and referrals | Referral tracking (sales person, owner, registration, eligibility, incentive status), bulk approve and mark paid, sales people with copyable codes, incentive rule |
| Payments, tax and GST | Gateways (enable, live/test, keys), GST rates restaurants can use, platform invoice settings |
| Third-party integrations | Online orders, messaging, apps, accounting; error banner with retry; connect/configure/disconnect |
| Notifications | Compose with audience, channels, scheduling and preview; history; automatic alerts |
| Support chatbot | Inbox with bot and agent messages, reply, resolve; bot answers |
| Audit log | Filterable log, before/after changes per entry, CSV export |
| Settings | General, registration (approval target, required documents, referral code rules), security, branding |

## Restaurant Owner modules

Franchise owners pick an outlet or All outlets in the top bar; every page follows that choice.

| Module | What it does |
|---|---|
| Dashboard | Today's sales vs the same time last week, orders, average bill, tables in use, sales by hour, what needs attention, month's sales/expenses/profit, outlet comparison, best sellers, recent activity |
| Orders | Running, completed and cancelled orders with filters; order detail with GST breakup and kitchen progress |
| Tables and floor | Floor plan per outlet with live status; bookings, including customer app requests to confirm or decline |
| Menu | Items and categories shared by all outlets, availability per outlet, category timings, add and edit items |
| Inventory | Stock per outlet with reorder levels and days left; purchases, wastage and count corrections; stock history including chef app updates |
| Staff | Employees, roles, shifts and weekly offs; shift roster; plan login limit |
| Access management | Per staff: role defaults (locked on), extras the owner grants, features outside the plan (locked off) |
| Customers | Placeholder until the scope is decided |
| Expenses | Approve or reject expenses above the manager limit; add expenses; month by category |
| Approvals | Cancellations, discounts, refunds and stock corrections from staff; approving applies the change |
| Reports | Sales, GST (with Section 9(5) aggregator split), items, inventory, staff and expenses for today, 7 or 30 days; CSV export |
| Notifications | Activity feed with unread state; alert preferences for app and WhatsApp |
| Settings | Restaurant, outlets (suspended outlet licence upload), billing, payments, printers, staff limits, delivery app IDs, plan |
| Audit logs | Changes from the owner panel, biller panel and chef app with before and after values |

## Access model

```
effective = planFeatures ∩ (roleDefaults ∪ ownerGrantedExtras)
```

Global Admin and Sales Person aren't limited by a restaurant plan. Staff use `staffType`
(`MANAGER`, `BILLER`, `CHEF`) inside `RMS_STAFF` to pick their defaults. Ideally the backend
returns the resolved list on login and the frontend only checks it.

Adding a module:
1. Add a feature key in `config/permissions.js` (and to role defaults if needed).
2. Add a nav item in the panel's `nav.js` with that `feature`.
3. Build the page and register it in the panel's `pages` map. Hidden in the sidebar and
   guarded on the route automatically for users without the feature.

## Design tokens

Defined in `src/index.css` under `@theme`. Brand colors come from the logo:
`brand-500` `#FF5A00` (plate orange, actions and highlights) and `ink-900` `#122029`
(the navy D, sidebar and headings). Type: Fredoka for display numbers and titles (echoes the
rounded wordmark), Figtree for everything else. Use token names in components, not raw hex.
For orange text on white at body size, use `brand-700` for contrast.
