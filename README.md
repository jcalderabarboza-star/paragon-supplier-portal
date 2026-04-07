# 🏭 Paragon Supplier Portal

A multi-channel procurement collaboration platform for **Paragon Corp** — Indonesia's leading beauty conglomerate behind brands including **Wardah**, **Emina**, **Make Over**, **BLP**, and **Scarlett by Wardah**.

The portal enables Paragon's procurement team (buyers) and their suppliers to collaborate on purchase orders, inventory, compliance documents, invoices, and ship notices — all through a single, responsive web application.

---

## Live Demo

**[https://jcalderabarboza-star.github.io/paragon-supplier-portal/](https://jcalderabarboza-star.github.io/paragon-supplier-portal/)**

No credentials required — use Demo Mode on the login screen.

---

## Demo Credentials (Demo Mode)

| Persona | Access | Description |
|---------|--------|-------------|
| Buyer | Click **"👔 View as Buyer"** | Paragon procurement team — James Chen |
| Supplier | Click **"🏭 View as Supplier"** | PT Berlina Packaging Indonesia — Sri Kusuma |

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 6 | Build tooling & dev server |
| SAP UI5 Web Components React | 2.5 | Enterprise component library |
| Recharts | 2 | Charts & data visualisation |
| React Router | 6 | Client-side routing (HashRouter for GH Pages) |
| Inter (Google Fonts) | — | Typography |

---

## Pages

### Buyer Persona

| Route | Page | Description |
|-------|------|-------------|
| `/buyer/dashboard` | Dashboard | KPI cards, stock alerts, PO activity feed, channel adoption chart |
| `/buyer/purchase-orders` | Purchase Orders | Full PO table with filter bar, status tiles, and detail side panel |
| `/buyer/suppliers` | Supplier Directory | Card grid with OTIF bars, cert expiry badges, and invite modal |
| `/buyer/inventory` | Inventory Visibility | Stock status table, heatmap (material × supplier), refresh |
| `/buyer/analytics` | Analytics & Insights | Coming Soon — Phase 2 feature cards |

### Supplier Persona

| Route | Page | Description |
|-------|------|-------------|
| `/supplier/dashboard` | Supplier Dashboard | Welcome banner, quick stats, action items, performance bars, compliance |
| `/supplier/orders` | My Orders | PO table with inline confirm panel and editable quantities |
| `/supplier/ship-notices` | Ship Notices (ASN) | Confirmed POs ready for ASN creation |
| `/supplier/invoices` | Invoices | Submit and track invoices |
| `/supplier/inventory` | My Inventory | Placeholder — Phase 2 |
| `/supplier/documents` | My Documents | Placeholder — Phase 2 |

### Authentication & Onboarding

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | Tabbed login for Paragon Team and Supplier, Demo Mode buttons |
| `/register` | Supplier Registration | 5-step self-registration wizard (standalone, no AppShell) |

---

## Project Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx       # Main layout wrapper (TopBar + Sidebar + Outlet)
│   │   ├── TopBar.tsx         # Dark 56px header with logo, bell, avatar
│   │   └── Sidebar.tsx        # Dark 220px sidebar with persona toggle pills
│   └── shared/
│       ├── KpiCard.tsx        # KPI card with coloured left border
│       ├── StatusBadge.tsx    # Pill-shaped semantic status badges
│       └── DataTable.tsx      # Generic table component
├── context/
│   └── PersonaContext.tsx     # Buyer/Supplier persona state (React Context)
├── data/
│   ├── mockPurchaseOrders.ts  # 15 POs across 8 suppliers
│   ├── mockSuppliers.ts       # 8 supplier profiles with scorecards
│   ├── mockInventory.ts       # 20 inventory records
│   └── mockKpis.ts            # KPI values and alert counts
├── pages/
│   ├── auth/Login.tsx
│   ├── buyer/                 # 5 buyer pages
│   ├── supplier/              # 6 supplier pages
│   └── onboarding/            # Supplier registration wizard
├── router/
│   └── AppRouter.tsx          # HashRouter with all routes
├── theme/
│   └── fioriTheme.ts          # Design tokens (colours, shell constants)
├── types/
│   ├── supplier.types.ts      # POStatus, StockStatus, ChannelType enums
│   └── kpi.types.ts           # KpiItem interface
├── index.css                  # Inter font, portal-card utilities, scrollbar
└── main.tsx                   # React root, ThemeProvider, CSS import
```

---

## Development

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Type-check and build for production
npm run build

# Deploy to GitHub Pages (gh-pages branch)
npm run deploy
```

---

## Roadmap

### Phase 1 — MVP (Complete ✅)
- Multi-persona portal (Buyer / Supplier) with role-based navigation
- Purchase Order management with acknowledgement workflow
- Supplier Directory with OTIF scorecards and compliance tracking
- Inventory Visibility with stock status heatmap
- Supplier self-registration 5-step wizard
- WhatsApp / Web Portal / API / EDI channel support

### Phase 2 — Intelligence (Planned)
- **ARIA** (Adaptive Replenishment & Intelligence Agent) — AI-driven demand forecasting and procurement recommendations
- Spend Analytics with drill-down by category, supplier, and time period
- ASN (Advance Ship Notice) creation with EDI 856 integration
- E-invoicing with SAP Ariba integration
- Supplier Risk Map with geographic visualisation

### Phase 3 — Ecosystem (Future)
- Mobile app for supplier field operations (WhatsApp-first)
- Automated PO generation from reorder triggers
- Supplier onboarding e-learning and certification portal
- Multi-entity support (Wardah, Emina, Make Over brand separation)

---

## Part of Odyssey Program

> This portal is **Ops Project #11** of the Paragon Corp **Odyssey Digital Transformation Program** — a company-wide initiative to digitise procurement, supply chain, and operations across all Paragon brands.

---

*Built with ❤️ using React + SAP UI5 Web Components*
