//src/routes/taskRoutes.test.ts
import request from "supertest";
import app from "../server";
import { pool } from "../db/pool";

describe("Task API Routes", () => {
  // shared across tests since they run in sequence and depend on
  // the id created in the "POST /tasks creates a task" test
  let createdTaskId: number;

  // close the db connection pool after all tests finish,
  // otherwise Jest hangs waiting for open connections
  afterAll(async () => {
    await pool.end();
  });

  test("GET /tasks returns a list", async () => {
    const res = await request(app).get("/tasks");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("POST /tasks creates a task", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({ title: "Write checkpoint tests", description: "Add jest + supertest" });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.title).toBe("Write checkpoint tests");
    expect(res.body.status).toBe("todo"); // default status when not provided

    createdTaskId = res.body.id; // save for later tests
  });

  test("POST /tasks without title returns 400", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({ description: "missing title" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("GET /tasks/:id returns one task", async () => {
    const res = await request(app).get(`/tasks/${createdTaskId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(createdTaskId);
  });

  test("GET /tasks/:id with unknown id returns 404", async () => {
    const res = await request(app).get("/tasks/999999");
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  test("PATCH /tasks/:id updates a task", async () => {
    const res = await request(app)
      .patch(`/tasks/${createdTaskId}`)
      .send({ status: "in-progress" });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("in-progress");
  });

  test("DELETE /tasks/:id deletes a task", async () => {
    const res = await request(app).delete(`/tasks/${createdTaskId}`);
    expect(res.statusCode).toBe(200);

    // confirm it's really gone
    const checkRes = await request(app).get(`/tasks/${createdTaskId}`);
    expect(checkRes.statusCode).toBe(404);
  });
});