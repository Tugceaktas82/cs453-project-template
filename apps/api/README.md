# CS453 Project — Checkpoint 1: Core API Structure

A database backed REST API for managing tasks, built with Express, TypeScript, and PostgreSQL. This is the first checkpoint of the semester project (a small team task/issue tracking system), focused on the task CRUD foundation.

## Features

* **Express + TypeScript:** Strongly typed REST API.
* **PostgreSQL Persistence:** Tasks are stored in a real PostgreSQL database (no in memory data).
* **Refactored Structure:** Routes, business logic, and database access are separated into distinct layers.
* **Validation & Error Handling:** Proper 400/404/500 responses with JSON error messages.
* **Automated Tests:** Jest + Supertest cover all CRUD routes and error cases.

## Note on dependencies

The starter template already defined a `"test": "jest"` script, but did not include the `jest` package itself (or `supertest`, `ts-jest`, and their type definitions). These were added on top of the template so the test script actually works and the checkpoint's automated testing requirement could be met. Everything else in `package.json` matches the original template.

## Project Structure

```text
cs453-project-template/
├── apps/
│   ├── api/                        # this checkpoint lives here
│   │   ├── src/
│   │   │   ├── server.ts           # Express app setup and route mounting
│   │   │   ├── config/
│   │   │   │   ├── env.ts          # Environment variable loader
│   │   │   │   └── .env
│   │   │   ├── db/
│   │   │   │   └── pool.ts         # PostgreSQL connection pool
│   │   │   ├── routes/
│   │   │   │   ├── taskRoutes.ts       # Thin route handlers for /tasks
│   │   │   │   └── taskRoutes.test.ts  # Automated tests (Jest + Supertest)
│   │   │   └── services/
│   │   │       └── taskService.ts  # Database query logic
│   │   ├── jest.config.js
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── tsconfig.json
│   │   └── README.md               # you are here
│   └── client/                     # simple browser client (not part of checkpoint 1)
│       └── README.md
├── database/
│   ├── schema.sql                  # Database schema (tasks table, trigger)
│   └── README.md                   # Docker/DB setup notes
├── docs/                           # architecture documentation
├── scripts/                        # dev utility scripts
├── docker-compose.yml              # starts the PostgreSQL container
├── .env.example
├── .gitignore
├── .nvmrc
├── package.json                    # root-level scripts (db:start, db:stop, db:reset)
├── package-lock.json
└── README.md                       # top-level project overview
```

> Only `apps/api/` and `database/schema.sql` are relevant to Checkpoint 1. The `apps/client/` folder, `docs/`, and `scripts/` are part of the overall semester project template and will be used in later checkpoints.

## Prerequisites

* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [Docker](https://www.docker.com/) (for running PostgreSQL locally)

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

Alternatively, if `psql` is installed locally, you can run it directly against the exposed port:

```bash
psql postgresql://postgres:postgres@localhost:5432/cs453 -f database/schema.sql
```

Both commands create the `tasks` table (and a trigger that automatically updates `updated_at` on every update). Either script is safe to re run.

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

**1. What is the difference between an in memory API and a database backed API?**

In our previous lab the API just kept everything in a plain JavaScript array while the server was running. The second you restart the server all that data disappears because it only ever lived in RAM. This project is different because tasks actually get saved in PostgreSQL, which is its own separate process with real storage on disk. That means the data is still there after a restart, and if we ever had multiple server instances they could all share the same data. We also get things like constraints and indexing for free from the database. The downside is it's more work to set up, now we need a connection pool and actual SQL queries instead of just pushing to an array, and we have to think about what happens if the database call fails.

**2. Why is it useful to separate routes, services, and database logic?**

Basically it keeps each part of the code doing one job instead of everything being mixed together. The routes file (`taskRoutes.ts`) only worries about the HTTP side of things, reading the request, checking if the input looks right, and picking the correct status code to send back. The service file (`taskService.ts`) is where the actual SQL queries live, so that's the part that knows how tasks are actually stored. Splitting it up this way makes it a lot easier to test the database logic on its own without needing to spin up the whole server. It also means if the schema changes later we really only need to touch the service file. Honestly it just makes the code less confusing to read since you're not scrolling through one giant file trying to figure out where the HTTP stuff ends and the SQL starts.

**3. What HTTP status codes did you use, and why?**

200 OK is used for GET, PATCH, and DELETE when everything goes fine and there's a normal response to send back. 201 Created is only for POST, since that's the one creating something new on the server. 400 Bad Request shows up when the client sends something invalid, like leaving out the title when creating a task, or putting something that isn't a number where a task id should be. 404 Not Found happens when the task id is a valid number but there's just no task with that id in the database, or if someone hits a route that doesn't exist at all. And 500 Internal Server Error is the fallback for when something breaks on our end, like the database connection dropping, which gets caught in a try/catch so the whole server doesn't crash.

**4. What happens when a client requests a task ID that does not exist?**

First the route pulls the id out of the URL and checks that it's actually a valid number. Assuming it is, it calls something like `taskService.getTaskById(id)` (or the update/delete equivalent), which runs a query filtered by that id. If nothing matches, the service just returns null for GET and PATCH, or a rowCount of 0 for DELETE. The route then checks for that and sends back a 404 with a small JSON error like `{ "error": "Task not found" }` instead of just crashing or sending back an empty 200 like nothing happened.

**5. What was the hardest part of connecting the API to PostgreSQL?**

Honestly the PATCH endpoint gave me the most trouble. Since someone might only send one field, like just `status`, the UPDATE query can't be hardcoded with all three columns every time, it has to be built dynamically so it only touches whatever fields were actually sent. On top of that I still needed to use parameterized queries ($1, $2, etc) instead of just plugging values straight into the string, otherwise it's wide open to SQL injection. Keeping the query string and the values array lined up correctly, especially once the parameter index keeps climbing as more fields get added, took a few tries to get right. The other annoying part was getting the Express app to actually work with Supertest for testing, which meant I had to export the app separately from the app.listen() call so the tests don't try to open a real port every time.