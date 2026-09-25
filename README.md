# PeopleSpace

A clear Angular + Node.js + MongoDB login, signup, and user dashboard application.

## Project folders

- `frontend/` — Angular 21 standalone application
- `backend/` — Express REST API with MongoDB/Mongoose

Authentication uses a JWT stored in an HTTP-only cookie. The cookie cannot be read by frontend JavaScript. Passwords are hashed with bcrypt before being stored.

The user collection contains the requested `name`, `email`, `phone`, `city`, and `pincode` fields. It also contains `password`, `role`, and timestamps, which are required for authentication, admin authorization, and account management. Passwords are never returned by the API.

## Run locally

Requirements: Node.js 22+, npm, and MongoDB.

### 1. Start the backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Update `JWT_SECRET` in `.env` before starting. The API runs at `http://localhost:4000`. macOS AirPlay Receiver occupies port 5000, so this project uses 4000 instead.

### 2. Start the frontend

In another terminal:

```bash
cd frontend
npm install
npm start
```

Open `http://localhost:4200`.

## Create an admin

Set the `ADMIN_*` values in `backend/.env`, then run:

```bash
cd backend
npm run seed:admin
```

Run the command again whenever you want to update that admin's password or promote an existing account with the same email.

## REST API

- `POST /api/auth/signup` — create a user and sign in
- `POST /api/auth/login` — sign in and set the JWT cookie
- `POST /api/auth/logout` — clear the cookie
- `GET /api/auth/me` — get the signed-in user
- `GET /api/admin/summary` — admin dashboard counts
- `GET /api/admin/users?search=&city=&page=1&limit=10` — filter users
- `DELETE /api/admin/users/:id` — delete a user
- `GET /api/health` — API health check

All `/api/admin` routes require both a valid login cookie and the `admin` role.

## Production notes

Set `NODE_ENV=production`, use HTTPS, set `CLIENT_URL` to the deployed Angular URL, and use a long random `JWT_SECRET`. Deploy the frontend and API on the same site (for example, `app.example.com` and `api.example.com`) so the strict authentication cookie can remain CSRF-resistant.
