# BoardMate — Frontend

BoardMate is a hostel/boarding management system. This `frontend` contains the React + Vite single-page application used by students, hostel owners, and managers to handle bookings, complaints, maintenance, inventory, payments, notices and reports. The UI talks to the `Backend` (REST API) located in the sibling `Backend/` folder.

## System overview

- **Users & roles:** Student, Hostel Owner, Inventory Manager, Maintenance Manager, Room Manager, Technicians, Admin
- **Core features:** Authentication, Bookings, Complaints, Maintenance requests, Inventory management, Payments/finance, Notices, Reports
- **Tech stack (frontend):** React, Vite, Tailwind CSS, Axios
- **API:** REST API served by `Backend/` (default base URL: `http://localhost:5000`)

## Prerequisites

- Node.js 16+ and npm (or yarn)
- Git (optional)
- A running instance of the Backend (see below)

## Frontend — Install

1. Open a terminal and go to the frontend folder:

```
cd frontend
```

2. Install dependencies:

```
npm install
```

3. Create environment variables (optional):

Copy `.env.example` to `.env` if present, or create a `.env` with at least:

```
VITE_API_BASE_URL=http://localhost:5000/api
```

The frontend uses the `VITE_API_BASE_URL` environment variable to reach the backend API.

## Frontend — Run (development)

Start the dev server with hot reload:

```
npm run dev
```

The app will be available at the URL printed by Vite (typically `http://localhost:5173`).

## Frontend — Build & Preview (production)

Build a production bundle:

```
npm run build
```

Preview the production build locally:

```
npm run preview
```

## Backend — Quick start (local)

The backend lives in the `Backend/` folder. To run it locally:

```
cd ../Backend
npm install
npm run dev
```

The backend `dev` script runs the TypeScript server (via `ts-node-dev`). By default it listens on the port defined in the backend `.env` (commonly `5000`).

## Run the full system

1. Start the Backend (`Backend/`): `npm run dev`.
2. Start the Frontend (`frontend/`): `npm run dev`.
3. Open the frontend URL shown by Vite and interact with the app. If you get CORS or API errors, confirm `VITE_API_BASE_URL` matches the backend address.

## Troubleshooting

- If the UI cannot reach the API, check `VITE_API_BASE_URL` and backend logs.
- If ports conflict, change the Vite port via `--port` or the backend port in its `.env`.
- For linting: `npm run lint` (frontend).

## Contributing

See the root project's contribution guidelines. Keep UI changes isolated to the `frontend/src/` folder and coordinate API contract changes with the backend team.

---

If you want, I can also update the repository root `README.md` or add a `frontend/.env.example`. Want me to do that now?
