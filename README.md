# Mashkay Auto Parts — Commercial Fleet Inventory & POS System

A comprehensive commercial fleet inventory tracking and point-of-sale (POS) system built with React, TypeScript, Tailwind CSS, and Firebase Firestore. Supports real-time multi-device cloud synchronization, automated Excel-compatible reorder calculations, sales management with automatic inventory deduction, and CSV import/export.

## ✨ Core Features

- **Fleet Commercial Categories**: Specialized classifications for Trucks, Buses, Trailers, Passenger Cars, Heavy Equipment, and Delivery Fleet.
- **Automated Reorder Formula**: Implements the standard Excel condition `=IF(Stock < Reorder Level, "Reorder", "OK")` with live visual badges and formula inspection bar.
- **Dynamic Price & Stock Management**:
  - Click-to-edit unit prices directly in the table or via the Add/Edit part modal.
  - Interactive increment/decrement stock stepper buttons with instant cloud propagation.
  - Batch valuation calculations (`Stock × Unit Price`).
- **POS Sales Management**:
  - Record single sales with automatic stock deduction and invoice/customer logging.
  - One-click "Sell" button on every catalog row.
  - Void transaction capability with automatic unit restoration to warehouse stock.
- **Sales CSV / POS Batch Import**:
  - Import transaction records from QuickBooks, Square, Clover, or Excel.
  - Intelligent column mapping and preview of before/after stock levels prior to commit.
- **Sales Analytics & Reporting**:
  - Date range filters (Today, Yesterday, Last 7 Days, This Month, Last 30 Days, All Time).
  - Metrics for Total Revenue, Units Sold, Orders Count, and Average Order Value.
  - Formatted print ledger and one-click CSV report export.
- **Real-Time Cloud Synchronization**: Powered by Firebase Firestore listeners (`onSnapshot`) ensuring all connected workstations and tablets stay up to date simultaneously.
- **Inventory Import & Export**: Full CSV backup, custom imports with schema mapping, and batch row deletion.

---

## 🚀 Quick Start (Running Locally)

### 1. Open Terminal or Command Prompt in the project folder
```bash
npm install
```

### 2. Start the development server
```bash
npm run dev
```

### 3. Open in your browser
Navigate to:
```text
http://localhost:3000
```

---

## 🛠️ Tech Stack & Scripts

- **Framework**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: Google Firebase Firestore (Real-time Cloud DB)

| Command | Description |
|---|---|
| `npm run dev` | Starts the local dev server on port 3000 |
| `npm run build` | Compiles the production bundle into `dist/` |
| `npm run lint` | Runs TypeScript type-checking without emitting files |

