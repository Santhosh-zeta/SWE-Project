# Personal Finance Tracker

A complete Personal Finance Tracker web application built with Next.js (App Router), Node.js/Express, PostgreSQL, and Prisma.

## Overview

Users can manage their monthly salary, configure fixed and monthly-reset expense categories, record daily expenses, and visualise spending through analytics and reports. The system supports predefined categories for common expenses, custom user-defined categories, and automatic monthly resets.

## Architecture & Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, CSS Modules, Chart.js |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Security | JWT Authentication, bcrypt, express-rate-limit, Helmet |
| Validation | Zod |

## Pages

| Page | Route | Description |
|---|---|---|
| Dashboard | `/dashboard` | Monthly summary — salary, total spent, remaining, category progress, recent expenses |
| Expenses | `/expenses` | Spreadsheet-style expense table with quick-add row, search, filters, pagination |
| Categories | `/categories` | Manage all categories — create, edit, archive/restore |
| Budget | `/budget` | Month-by-month budget view; inline editing of planned amounts per category |
| Analytics | `/analytics` | Pie chart of spending distribution; custom date ranges |
| Reports | `/reports` | Annual month-by-month summary table; one-click CSV export |
| Settings | `/settings` | Update profile (name, age, monthly salary) |

## Requirements Coverage

### SRS Functional Requirements

| FR | Requirement | Status |
|---|---|---|
| FR1 | Personal information management (name, age) | ✅ Done |
| FR2 | Salary management | ✅ Done |
| FR3 | Predefined fixed expense categories (Rent, Water, Electricity, Food, Gas) | ✅ Done — seeded on registration |
| FR4 | Monthly budget management (monthly-reset categories) | ✅ Done |
| FR5 | Custom categories | ✅ Done |
| FR6 | Daily expense entry — spreadsheet-like interface | ✅ Done — inline quick-add row in table |
| FR7 | Automatic category total update on expense entry | ✅ Done |
| FR8 | Category-based visual identification of expense rows | ✅ Done — left-border colour per row |
| FR9 | Fixed category expense handling (no monthly reset) | ✅ Done |
| FR10 | Monthly category progress (spent vs. budget) | ✅ Done |
| FR11 | Monthly reset for monthly-reset categories | ✅ Done — implicit via date-scoped queries |
| FR12 | Expense percentage distribution calculation | ✅ Done |
| FR13 | Pie chart of spending by category | ✅ Done |

### Features Beyond the SRS

| Feature | Where | Notes |
|---|---|---|
| **Budget page** | `/budget` | Dedicated month-by-month budget view separated from category management; inline budget amount editing without leaving the page |
| **Reports page** | `/reports` | Annual month-by-month summary table (total, count, top category per month) with year navigation |
| **CSV export** | `/reports` | One-click download of all expenses for the selected year as a `.csv` file |
| **Expense search** | `/expenses` | Description-text search using the `?search=` query parameter |
| **Expense pagination** | `/expenses` | 20-per-page pagination with Prev / Next controls; total count shown |
| **Category editing** | `/categories` | Edit button on every category row; pre-fills the modal with current values |
| **Predefined categories on sign-up** | Registration | 8 default categories (5 FIXED + 3 MONTHLY_RESET) created automatically for every new user |
| **Archive / restore categories** | `/categories` | Soft-delete: archived categories are hidden from expense entry but preserved in history |
| **Over-budget alerts** | Dashboard & Budget | Visual warning + "X over budget" label when spending exceeds the configured amount |
| **Multi-period analytics** | `/analytics` | Current month, previous month, last 3 / 6 months, full year, or custom date range |

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register — creates account + default categories |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| GET/PUT | `/api/profile` | Get or update profile / salary |
| GET/POST | `/api/categories` | List or create categories |
| PUT | `/api/categories/:id` | Update category (name, type, budget, colour) |
| PATCH | `/api/categories/:id/archive` | Soft-delete a category |
| PATCH | `/api/categories/:id/restore` | Restore an archived category |
| GET/POST | `/api/expenses` | List (with `month`, `categoryId`, `search`, `page`, `limit`) or create |
| PUT/DELETE | `/api/expenses/:id` | Update or delete an expense |
| GET | `/api/dashboard` | Monthly summary with category stats and recent expenses |
| GET | `/api/analytics` | Spending by category for a date range (`from`, `to`) |
| GET | `/api/reports/monthly` | Month-by-month summary for a given `year` |

## Setup & Running the Project

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [PostgreSQL](https://www.postgresql.org/) running locally on port `5432`

---

### Step 1: Database Setup

Ensure PostgreSQL is running and create the database:

```bash
# Using PostgreSQL CLI
createdb finance_tracker
```
*(Or create a database named `finance_tracker` via pgAdmin / psql).*

---

### Step 2: Backend Setup & Launch

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Configure environment variables in `backend/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_tracker?schema=public"
   JWT_SECRET="supersecret_do_not_use_in_prod"
   PORT=3000
   FRONTEND_URL="http://localhost:3001"
   ```
   *(Update username and password in `DATABASE_URL` if your PostgreSQL credentials differ).*

3. Install dependencies:
   ```bash
   npm install
   ```

4. Push schema and generate Prisma client:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. (Optional) Seed demo user & initial categories:
   ```bash
   npx ts-node seed.ts
   ```

6. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend API will start on **`http://localhost:3000`** (Health check endpoint: `http://localhost:3000/api/health`).

---

### Step 3: Frontend Setup & Launch

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The frontend application will start on **`http://localhost:3001`**.

4. Open your browser and visit:
   **[http://localhost:3001](http://localhost:3001)**

---

### Running Tests

- **Backend tests** (Jest):
  ```bash
  cd backend
  npm test
  ```

- **Frontend tests** (Vitest):
  ```bash
  cd frontend
  npm test
  ```

---

### Production Build

- **Backend compilation**:
  ```bash
  cd backend
  npx tsc
  ```

- **Frontend build & start**:
  ```bash
  cd frontend
  npm run build
  npm start
  ```
