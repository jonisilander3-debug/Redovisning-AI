# Northstar UI Foundation

This repository contains the first frontend foundation for a modern SaaS web app aimed at small businesses.

The current scope is intentionally narrow:

- Next.js with the App Router
- React and TypeScript
- Tailwind CSS
- Responsive application shell with sidebar and topbar
- Reusable UI primitives
- A polished dashboard page with placeholder business content

No backend business logic has been added yet.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` starts the local development server
- `npm run build` creates a production build
- `npm run start` runs the production build locally
- `npm run lint` runs ESLint

## Project Structure

```text
.
|-- public/
|-- src/
|   |-- app/
|   |   |-- globals.css
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- components/
|   |   |-- dashboard/
|   |   |   |-- dashboard-page.tsx
|   |   |   `-- kpi-card.tsx
|   |   |-- layout/
|   |   |   |-- app-shell.tsx
|   |   |   |-- sidebar.tsx
|   |   |   `-- topbar.tsx
|   |   `-- ui/
|   |       |-- button.tsx
|   |       |-- card.tsx
|   |       |-- empty-state.tsx
|   |       |-- number-display.tsx
|   |       |-- page-header.tsx
|   |       `-- status-badge.tsx
|   `-- lib/
|       `-- utils.ts
|-- package.json
`-- README.md
```

## Design Direction

The interface is built around:

- white page background
- soft gray surfaces
- blue primary actions
- turquoise accents
- green, red, and neutral number states
- rounded corners and soft shadows
- calm spacing and friendly business wording

## Current Scope

Included now:

- app shell and navigation
- responsive dashboard layout
- reusable design system components
- static placeholder content for the first product pass

Planned for later:

- backend logic
- customer data flows
- accounting and payroll workflows
- invoicing logic
- authentication and permissions
