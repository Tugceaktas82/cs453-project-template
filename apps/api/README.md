# CS453 Project — Checkpoint 1: Core API Structure

A database-backed REST API for managing tasks, built with Express, TypeScript, and PostgreSQL. This is the first checkpoint of the semester project (a small team task/issue tracking system), focused on the task CRUD foundation.

## Features

- **Express + TypeScript:** Strongly typed REST API.
- **PostgreSQL Persistence:** Tasks are stored in a real PostgreSQL database (no in-memory data).
- **Refactored Structure:** Routes, business logic, and database access are separated into distinct layers.
- **Validation & Error Handling:** Proper 400/404/500 responses with JSON error messages.
- **Automated Tests:** Jest + Supertest cover all CRUD routes and error cases.

## Project Structure

```text
apps/api/
├── src/
│   ├── server.ts              # Express app setup and route mounting
│   ├── config/
│   │   ├── env.ts             # Environment variable loader
│   │   └── .env
│   ├── db/
│   │   └── pool.ts            # PostgreSQL connection pool
│   ├── routes/
│   │   ├── taskRoutes.ts      # Thin route handlers for /tasks
│   │   └── taskRoutes.test.ts # Automated tests (Jest + Supertest)
│   └── services/
│       └── taskService.ts     # Database query logic
├── jest.config.js
├── package.json
└── tsconfig.json

database/
└── schema.sql                 # Database schema (tasks table, trigger)
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Docker](https://www.docker.com/) (for running PostgreSQL locally)

## Getting Started

### 1. Install dependencies

From the `apps/api` directory:

```bash
npm install
```

### 2. Configure the database connection

A `.env` file should already exist at `src/config/.env`. If it doesn't, create one with:

```bash
touch src/config/.env
```

The `.env` file should define:

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cs453
```

### 3. Start PostgreSQL

From the project root:

```bash
npm run db:start
```

This runs `docker compose up -d` and starts a PostgreSQL container (`cs453-postgres`).

To stop the database:

```bash
npm run db:stop
```

To reset it completely (removes volumes/data):

```bash
npm run db:reset
```

### 4. Create the database tables

Run the schema file against the running container:

```bash
docker exec -i cs453-postgres psql -U postgres -d cs453 < database/schema.sql
```

This creates the `tasks` table (and a trigger that automatically updates `updated_at` on every update). The script is safe to re-run.

### 5. Start the server

From `apps/api`:

```bash
npm run dev
```

The server will start on `http://localhost:3000`.

You can verify the database connection with:

```bash
curl http://localhost:3000/db-health
```

Expected response:

```json
{ "status": "ok", "database": "connected", "currentTime": "..." }
```

### 6. Run tests

Make sure the PostgreSQL container is running (step 3), then from `apps/api`:

```bash
npm test
```

All 7 tests should pass, covering every required scenario:

```
✓ GET /tasks returns a list
✓ POST /tasks creates a task
✓ POST /tasks without title returns 400
✓ GET /tasks/:id returns one task
✓ GET /tasks/:id with unknown id returns 404
✓ PATCH /tasks/:id updates a task
✓ DELETE /tasks/:id deletes a task
```

## API Routes

| Method | Route        | Description              |
|--------|--------------|---------------------------|
| GET    | /health      | API health check          |
| GET    | /db-health   | Database connectivity check |
| GET    | /tasks       | Return all tasks          |
| POST   | /tasks       | Create a new task         |
| GET    | /tasks/:id   | Return one task by ID     |
| PATCH  | /tasks/:id   | Update an existing task   |
| DELETE | /tasks/:id   | Delete an existing task   |

### Example Requests

```bash
# Create a task
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Write checkpoint tests","description":"Add jest + supertest"}'

# Get all tasks
curl http://localhost:3000/tasks

# Get one task
curl http://localhost:3000/tasks/1

# Update a task
curl -X PATCH http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"in-progress"}'

# Delete a task
curl -X DELETE http://localhost:3000/tasks/1
```

## Task Schema

```json
{
  "id": 1,
  "title": "Create task API",
  "description": "Optional description",
  "status": "todo",
  "createdAt": "2026-06-28T03:18:08.790Z",
  "updatedAt": "2026-06-28T03:18:08.790Z"
}
```

`title` is required when creating a task. `status` defaults to `"todo"` if not provided. `updated_at` is updated automatically by a database trigger on every update.

## Reflection Questions

**1. What is the difference between an in-memory API and a database-backed API?**

An in-memory API (like our previous lab) stores data in a plain JavaScript array or object that lives only in the server's RAM while the process is running. The moment the server restarts, all data is lost. A database-backed API, like this one, persists data in PostgreSQL, a separate process with its own storage on disk. This means the data survives server restarts, can be shared across multiple server instances, and benefits from database features like transactions, constraints, and indexing. The trade-off is added complexity: we now need a connection pool, SQL queries, and error handling for database failures, instead of simple array operations.

**2. Why is it useful to separate routes, services, and database logic?**

Separating these layers follows the principle of separation of concerns. Routes (`taskRoutes.ts`) are responsible only for handling HTTP concerns: parsing the request, validating input shape, and choosing the right status code. Services (`taskService.ts`) contain the actual business/data logic, in this case the SQL queries themselves. This separation makes the code easier to test (we can test the service logic independently of HTTP), easier to maintain (a change to the database schema only affects the service layer), and easier to reason about, since each file has a single, clear responsibility instead of one large file mixing HTTP handling with raw SQL.

**3. What HTTP status codes did you use, and why?**

- **200 OK** — for successful GET, PATCH, and DELETE operations, where the request succeeded and a normal response body is returned.
- **201 Created** — for successful POST requests, since a new resource (a task) was created on the server.
- **400 Bad Request** — when the client sends invalid input, such as creating a task without a `title`, or providing a non-numeric task ID.
- **404 Not Found** — when a task with the given ID does not exist in the database, or when a completely unknown route is requested.
- **500 Internal Server Error** — when something unexpected fails on the server side, such as a database connection issue, which is caught in a `try/catch` block so the server doesn't crash.

**4. What happens when a client requests a task ID that does not exist?**

The route handler first parses the ID from the URL parameter. If it's a valid number, it calls `taskService.getTaskById(id)` (or the corresponding update/delete method), which runs a `SELECT`/`UPDATE`/`DELETE` query filtered by that ID. If no row matches, the service returns `null` (for `GET`/`PATCH`) or a `rowCount` of `0` (for `DELETE`). The route handler checks for this and responds with a `404` status code and a JSON body like `{ "error": "Task not found" }`, rather than crashing or returning an empty `200` response.

**5. What was the hardest part of connecting the API to PostgreSQL?**

The trickiest part was making sure the `PATCH` endpoint correctly handled partial updates. Since a client might only send one field (e.g., just `status`), the SQL `UPDATE` query needs to be built dynamically, only including the columns that were actually provided, while still using parameterized queries (`$1`, `$2`, ...) to prevent SQL injection. Getting the query string and the values array to stay in sync, especially with the increasing parameter index, took careful attention. Another challenge was making sure the Express app could be properly tested with Supertest, which required exporting the `app` instance separately from the `app.listen()` call so that tests don't try to open a real network port.
