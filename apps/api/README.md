# CS453 Project - Checkpoint 2 - Checkpoint 2 - Data Model, Authentication, and Authorization

This checkpoint expands the task API from Checkpoint 1 into a multi-user system. Users can register, log in, create projects, and manage tasks. Each user can only see and change the things they own or are part of.

## What Changed Since Checkpoint 1

Added user registration and login with bcrypt password hashing. Added JWT tokens for authentication. Added projects with ownership rules. Tasks can now be linked to a project and assigned to a user. Added an admin role with access to user management routes. The API now returns correct 401, 403, and 404 responses depending on the situation. There are 31 automated tests total.

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
│   │   ├── authenticate.ts
│   │   └── authorize.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── authRoutes.test.ts
│   │   ├── projectRoutes.ts
│   │   ├── projectRoutes.test.ts
│   │   ├── taskRoutes.ts
│   │   ├── taskRoutes.test.ts
│   │   ├── userRoutes.ts
│   │   └── userRoutes.test.ts
│   └── services/
│       ├── authService.ts
│       ├── projectService.ts
│       ├── taskService.ts
│       └── userService.ts
├── jest.config.js
├── package.json
└── tsconfig.json

database/
└── schema.sql
```

## How to Run

### 1. Install dependencies

```bash
cd apps/api
npm install
```

### 2. Set up environment variables

Create a file at src/config/.env with the following:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cs453
JWT_SECRET=replace-this-with-a-secure-secret
JWT_EXPIRES_IN=7d
```

An example file is also included at .env.example in the project root.

### 3. Start the database

Run this from the project root:

```bash
npm run db:start
```

### 4. Create the tables

```bash
docker exec -i cs453-postgres psql -U postgres -d cs453 < database/schema.sql
```

This creates the users, projects, project_members, and tasks tables.

### 5. Create an admin account

Admin accounts cannot be created through the register endpoint. The role is always set to "user" on registration. To create an admin, insert one directly into the database:

```bash
docker exec -i cs453-postgres psql -U postgres -d cs453 << 'SQL'
INSERT INTO users (name, email, password_hash, role)
VALUES (
  'Admin',
  'admin@example.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin'
);
SQL
```

The password for that hash is "password". Replace it with your own bcrypt hash if needed.

### 6. Start the server

```bash
cd apps/api
npm run dev
```

The server runs at http://localhost:3000.

### 7. Run the tests

Make sure the database container is running first, then:

```bash
cd apps/api
npm test
```

All 31 tests should pass.

## Routes

### Public routes

| Method | Route | What it does |
|--------|-------|-------------|
| POST | /auth/register | Create a new account |
| POST | /auth/login | Log in and get a token |
| GET | /health | Check if server is up |
| GET | /db-health | Check database connection |

### Protected routes (token required)

| Method | Route | What it does |
|--------|-------|-------------|
| GET | /tasks | Get tasks you can see |
| POST | /tasks | Create a task |
| GET | /tasks/:id | Get one task |
| PATCH | /tasks/:id | Update a task |
| DELETE | /tasks/:id | Delete a task |
| GET | /projects | Get your projects |
| POST | /projects | Create a project |
| GET | /projects/:id | Get one project |
| PATCH | /projects/:id | Update a project (owner or admin only) |
| DELETE | /projects/:id | Delete a project (owner or admin only) |
| POST | /projects/:id/members | Add a member (owner only) |

### Admin only routes

| Method | Route | What it does |
|--------|-------|-------------|
| GET | /users | Get all users |
| GET | /users/:id | Get one user |

## How to Register and Log In

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"password123"}'

curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"password123"}'
```

The login response includes a token and basic user info:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "name": "Jane Doe", "email": "jane@example.com", "role": "user" }
}
```

## How to Use the Token

Add it to the Authorization header on any protected request:

```bash
curl http://localhost:3000/tasks \
  -H "Authorization: Bearer <your-token>"
```

## Access Control

Any logged in user can create projects and tasks. A user can only update or delete their own project. Only the project owner can add members. Admin users can update or delete any project and can access the user list. A regular user hitting an admin route gets 403. A request with no token or a bad token gets 401.

## Database Schema

```sql
users           (id, name, email, password_hash, role, created_at)
projects        (id, name, description, owner_id, created_at)
project_members (project_id, user_id)
tasks           (id, title, description, status, project_id, assigned_to, created_at, updated_at)
```

## Reflection Answers

See [answers.md](./answers.md).