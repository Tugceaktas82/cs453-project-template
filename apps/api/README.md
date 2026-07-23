# CS453 Project — Checkpoint 2: Data Model, Authentication, and Authorization

This checkpoint builds on the task API from Checkpoint 1 and turns it into a real multi-user system. Users can now register, log in, create projects, and manage tasks. Each user can only see and modify the resources they actually own or belong to.

## What Was Added

- User registration and login with hashed passwords
- JWT-based authentication for protected routes
- Projects with ownership and membership
- Tasks linked to projects and assignable to users
- Authorization rules so users only access their own data
- 23 automated tests covering all new and existing behavior

## Project Structure

```text
apps/api/
├── src/
│   ├── server.ts
│   ├── config/
│   │   ├── env.ts
│   │   └── .env
│   ├── db/
│   │   └── pool.ts
│   ├── middleware/
│   │   └── authenticate.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── authRoutes.test.ts
│   │   ├── projectRoutes.ts
│   │   ├── projectRoutes.test.ts
│   │   ├── taskRoutes.ts
│   │   └── taskRoutes.test.ts
│   └── services/
│       ├── authService.ts
│       ├── projectService.ts
│       └── taskService.ts
├── jest.config.js
├── package.json
├── package-lock.json
├── README.md
└── tsconfig.json

database/
├──  schema.sql
└──  README.md
```

## Setup

### 1. Install dependencies

```bash
cd apps/api
npm install
```

### 2. Create the .env file

Create `src/config/.env` with the following:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cs453
JWT_SECRET=supersecretkey123changeme
JWT_EXPIRES_IN=7d
```

### 3. Start the database

From the project root:

```bash
npm run db:start
```

### 4. Run the schema

```bash
docker exec -i cs453-postgres psql -U postgres -d cs453 < database/schema.sql
```

This creates the `users`, `projects`, `project_members`, and `tasks` tables.

### 5. Start the server

```bash
cd apps/api
npm run dev
```

### 6. Run the tests

Make sure the database is running first, then:

```bash
cd apps/api
npm test
```

All 23 tests should pass.

## API Routes

### Public (no token needed)

| Method | Route | Description |
|--------|-------|-------------|
| POST | /auth/register | Create a new account |
| POST | /auth/login | Log in and get a JWT token |
| GET | /health | Check if the server is up |
| GET | /db-health | Check database connection |

### Protected (requires Authorization header)

| Method | Route | Description |
|--------|-------|-------------|
| GET | /tasks | Get all tasks you can see |
| POST | /tasks | Create a task |
| GET | /tasks/:id | Get one task |
| PATCH | /tasks/:id | Update a task |
| DELETE | /tasks/:id | Delete a task |
| GET | /projects | Get all your projects |
| POST | /projects | Create a project |
| GET | /projects/:id | Get one project |
| PATCH | /projects/:id | Update a project (owner only) |
| DELETE | /projects/:id | Delete a project (owner only) |
| POST | /projects/:id/members | Add a member (owner only) |

## How Authentication Works

Register to create an account, then log in to get a token:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

The login response includes a token:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "email": "user@example.com" }
}
```

Pass the token in the Authorization header for all protected routes:

```bash
curl http://localhost:3000/tasks \
  -H "Authorization: Bearer <your-token>"
```

## Database Schema

```sql
users           (id, email, password_hash, created_at)
projects        (id, name, owner_id, created_at)
project_members (project_id, user_id)
tasks           (id, title, description, status,
                 project_id, assigned_to,
                 created_at, updated_at)
```

## Design Notes

**Authentication vs Authorization**

Authentication is just verifying who you are. When you log in with your email and password, the server checks the hash in the database and gives you a signed JWT. After that, every request includes that token so the server knows who is making it. Authorization is a separate step that
happens after — it checks whether you are actually allowed to do what you are trying to do. Logging in doesn't mean you can touch everyone else's projects.

**Password hashing**

Passwords are hashed with bcrypt before being stored. The plain text password never gets saved anywhere. This means if the database gets leaked, nobody can just read the passwords out of it. Bcrypt is also intentionally slow to compute, which makes brute force attacks harder.

**JWT tokens**

The token contains the user's ID and an expiry time, signed with a secret key. The server doesn't need to look up the user in the database on every request — it just verifies the signature. If the signature checks out, the token is valid and `req.userId` gets set in the
authenticate middleware for the rest of the route to use.

**Ownership and membership**

Project updates and deletes use `WHERE id = $1 AND owner_id = $2` in the SQL query so only the owner can modify their own projects. Task and project visibility uses a JOIN on `project_members` so users only see tasks from projects they belong to. The `userId` from the token gets passed into every service call to keep this consistent.