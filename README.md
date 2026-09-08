# Personal Finance Tracker

A complete, production-quality Personal Finance Tracker application built with Next.js (App Router), Node.js/Express, PostgreSQL, and Prisma.

## Overview
This application allows users to manage their personal information, track monthly salary, configure fixed and monthly-reset categories, and track daily expenses. It features a comprehensive dashboard and analytics views to visualize spending habits.

## Architecture & Technology Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, CSS Modules, Chart.js (react-chartjs-2)
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Security**: JWT Authentication, bcrypt, express-rate-limit, Helmet
- **Validation**: Zod (backend schema validation)

## Requirements & Setup

### Database Setup (PostgreSQL)
1. Ensure PostgreSQL is installed and running.
2. The default connection uses a local database named `finance_tracker`. You can modify this in `backend/.env`.

### Backend Setup
1. Navigate to the `backend` directory.
2. Copy `.env.example` to `.env` and fill in the values:
   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/finance_tracker?schema=public"
   JWT_SECRET="your_secure_secret"
   PORT=3000
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Push the Prisma schema and generate client:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
5. Start the backend in development mode:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3001` (or `3000` if the port is free).

## Production Build

### Backend
Run `npx tsc` inside the `backend` directory.

### Frontend
Run `npm run build` inside the `frontend` directory, followed by `npm start` to run the production server.

## API Documentation
The API contains routes for:
- `/api/auth` - Register, Login, Get Profile
- `/api/profile` - Update profile, Salary
- `/api/categories` - Manage categories (Fixed, Monthly Reset, Custom)
- `/api/expenses` - Manage daily expenses, filtering, pagination
- `/api/dashboard` - Get dashboard summaries with aggregations
- `/api/analytics` - Get analytics and pie chart data based on date ranges
