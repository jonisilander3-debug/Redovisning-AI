# Northstar Platform Foundation

This project now includes five core layers:

- a reusable SaaS frontend foundation
- an authentication and company workspace foundation
- a company member management and role-separation foundation
- an employee-facing My Day and time tracking foundation
- a projects and project-linked time foundation

The current scope supports:

- login and logout
- protected company workspaces
- onboarding for a new company owner
- member listing, role updates, and internal add-member flow
- role-aware navigation for admin-like users vs employees
- employee My Day with start and stop work flow
- employee time history
- admin company-wide time overview with filters
- project creation and editing
- assigning people to projects
- employee My Work with assigned projects
- time tracking linked to projects

It does not yet include receipts, invoicing, accounting, payroll, legal, or backoffice workflows.

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Prisma
- SQLite
- NextAuth credentials authentication

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create or sync the local database:

```bash
npm run db:push
```

3. Start the app:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

5. Create your company workspace at `/onboarding`

## Scripts

- `npm run dev` starts the development server
- `npm run build` creates a production build
- `npm run start` runs the production server
- `npm run lint` runs ESLint
- `npm run db:generate` generates the Prisma client
- `npm run db:push` syncs the Prisma schema to the local SQLite database

## Project Structure

```text
.
|-- prisma/
|   |-- dev.db
|   `-- schema.prisma
|-- public/
|-- src/
|   |-- app/
|   |   |-- (public)/
|   |   |   |-- login/page.tsx
|   |   |   `-- onboarding/page.tsx
|   |   |-- (workspace)/
|   |   |   `-- workspace/[companySlug]/
|   |   |       |-- members/page.tsx
|   |   |       |-- my-day/page.tsx
|   |   |       |-- my-work/page.tsx
|   |   |       |-- projects/page.tsx
|   |   |       |-- projects/[projectId]/page.tsx
|   |   |       |-- time/page.tsx
|   |   |       |-- [section]/page.tsx
|   |   |       |-- layout.tsx
|   |   |       `-- page.tsx
|   |   |-- api/
|   |   |   |-- auth/[...nextauth]/route.ts
|   |   |   |-- onboarding/route.ts
|   |   |   `-- workspace/[companySlug]/
|   |   |       |-- members/
|   |   |       |-- projects/
|   |   |       `-- time/
|   |   |-- globals.css
|   |   |-- layout.tsx
|   |   `-- page.tsx
|   |-- components/
|   |   |-- auth/
|   |   |-- dashboard/
|   |   |-- employee/
|   |   |-- layout/
|   |   |-- members/
|   |   |-- projects/
|   |   |-- time/
|   |   `-- ui/
|   |-- lib/
|   |   |-- access.ts
|   |   |-- auth.ts
|   |   |-- company.ts
|   |   |-- member-management.ts
|   |   |-- navigation.ts
|   |   |-- prisma.ts
|   |   |-- project-management.ts
|   |   |-- time-tracking.ts
|   |   `-- utils.ts
|   `-- types/
|       `-- next-auth.d.ts
|-- .env.example
|-- package.json
`-- README.md
```

## Auth And Access

- NextAuth credentials provider
- secure password hashing with `bcryptjs`
- JWT-backed session handling
- session data enriched with user id, role, company id, company name, and company slug

Protected access is separated by role:

- `OWNER`, `ADMIN`, `MANAGER`
  - broader company workspace
  - project management
  - company time overview
- `OWNER`, `ADMIN`
  - company member management
- `EMPLOYEE`
  - simplified employee navigation
  - personal My Day
  - personal My Work
  - personal time history only
  - only assigned projects are visible

## Data Model

The platform is structured around the company as the top-level workspace.

- `Company`
  - workspace/account container
  - stores company name, slug, and organization number
- `User`
  - belongs to exactly one company
  - stores name, email, password hash, role, and access status
- `Project`
  - belongs to one company
  - stores customer name, title, description, status, start/end dates, and optional location
- `ProjectAssignment`
  - joins users and projects
  - supports many-to-many project assignment
- `TimeEntry`
  - belongs to one company and one user
  - now optionally links to one project
  - stores work date, start time, end time, status, and optional note

Enums included now:

- `UserRole`
  - `OWNER`
  - `ADMIN`
  - `MANAGER`
  - `EMPLOYEE`
- `UserStatus`
  - `ACTIVE`
  - `INVITED`
  - `INACTIVE`
- `TimeEntryStatus`
  - `ACTIVE`
  - `COMPLETED`
- `ProjectStatus`
  - `PLANNED`
  - `ACTIVE`
  - `ON_HOLD`
  - `COMPLETED`

## Current Workflows

- onboarding creates the company and first owner
- owners and admins can add members and change roles
- owner/admin/manager can create and update projects
- owner/admin/manager can assign people to projects
- employees can see only their assigned projects in My Work
- employees can start work against one assigned project at a time
- employees can stop work and keep a lightweight note
- admin-like roles can review company-wide time entries filtered by employee, project, status, and date
- project detail pages show assigned team members, total logged time, and recent project time

## Product Feel

The current UI follows the same calm product language:

- white background
- soft gray surfaces
- blue and turquoise accents
- rounded cards and soft shadows
- friendly, non-technical wording

## Next Logical Step

The next strong step is to add richer work structure on top of projects:

- tasks or assignments inside projects
- choosing specific work items before starting time
- manager planning and project progress views
- clearer workload and delivery tracking
