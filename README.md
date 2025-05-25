# RentMate – Roommate Chore & Expense Scheduler

RentMate is a tool designed to help roommates manage shared chores and expenses efficiently. It aims to eliminate confusion and disputes by providing a centralized platform for tracking household responsibilities and finances.

## 🎯 Objective

Create a tool where roommates can:
- Join a shared household.
- Assign and track rotating chores.
- Log shared expenses.
- Automatically calculate who owes what.
- View a unified calendar for chores and expense due dates.

## 👥 User Role

All users in a household share chores and expenses.

## 🔐 Authentication & Authorization

- Login is required to join or create a household.
- The household owner manages membership.
- All members can log chores and expenses.

## 🧱 Core Functional Modules

1.  **Household Setup & Membership**:
    *   Create a new household or join an existing one using a code or email invite.
    *   View a list of household members with their roles (Owner vs. Member).
2.  **Chore Rotation Scheduler**:
    *   Define chores with specific frequencies (e.g., Daily, Weekly, Monthly).
    *   Automatically assign chores to the next member in rotation.
    *   Mark chores as completed, logging the date and the completer.
3.  **Shared Expense Logging**:
    *   Log expenses with details: Amount, Description, Date, Payer, and Participants (selectable).
    *   Default to equal splitting of expenses, with an option for custom share percentages.
4.  **Balance & Settlement**:
    *   View a dashboard showing the net balance for each member (amount owed or to receive).
    *   Receive "Settle Up" suggestions to minimize the number of transactions.
5.  **Calendar View**:
    *   Display a combined view of chore deadlines and expense due dates on a monthly calendar.
    *   Use color-coding to differentiate entries by type.
6.  **History & Export**:
    *   Access a chronological log of all chores and expenses.
    *   Export data to a CSV file.

## 🥞 Tech Stack

-   **Frontend**: Next.js, Tailwind CSS, shadcn/ui
-   **Backend**: Nest.js, PostgreSQL

## ✨ Key Features

-   **Reusable Components**: All features will be built using small, reusable components.
-   **Responsive Design**: The application will follow a mobile-first approach to ensure responsiveness across all devices.
-   **Rich UI/UX**: Emphasis on a clean, intuitive, and user-friendly interface.

## 📝 Notes from `requirements.txt`

The original `requirements.txt` file contained the project specification, including DB credentials. For security, these credentials should be managed via environment variables in a real deployment and not committed to the repository.

**Original DB Credentials (for reference during development - use environment variables in production):**
