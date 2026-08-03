# Car Showroom Management System (Kurdish / Sorani)

A complete, mobile-first PWA for car dealerships in Iraq & Kurdistan.

**Full guide in Kurdish: [`ڕێنمایی.md`](./ڕێنمایی.md)**

## Features

- Inventory with VIN, photos, colour/brand/model pickers, and an interactive body-damage map (paint / filler / dents / replaced panels)
- **Camera VIN scanning** — native `BarcodeDetector` → ZXing → Tesseract OCR fallback
- Sale flow → official **A4 contract** in Kurdish or Arabic, with signature + thumbprint boxes for both parties
- Full accounting: cashbox, expenses, per-car profit, installments & debts, partners & commission
- **Security ("Asayish") export centre** — bulk print / HTML / ZIP / CSV / share of contracts for a date range
- Roles & permissions, audit log, JSON backup & restore
- Works offline; installable on phones

## Stack

React 19 · TypeScript · Vite · Tailwind CSS · Zustand · Firebase (Firestore/Auth/Storage) with an IndexedDB fallback.

## Quick start

```bash
npm install
npm run dev
```

Runs immediately in **local mode** (IndexedDB). Connect Firebase from *Settings → Firebase* to share data across devices and staff.

```bash
npm run build     # → dist/
npm run preview
```

> Camera scanning requires HTTPS (or `localhost`).
