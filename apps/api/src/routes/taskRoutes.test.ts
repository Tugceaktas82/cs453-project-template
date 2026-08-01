import request from "supertest";
import app from "../server";
import { pool } from "../db/pool";

describe("Task Routes", () => {
    let token: string;
    let otherToken: string;
    let projectId: number;
    let createdTaskId: number;

    beforeAll(async () => {
        await pool.query("DELETE FROM users WHERE email IN ('tasktest@test.com', 'tasktest-other@test.com')");

        await request(app)
            .post("/auth/register")
            .send({ name: "Task Tester", email: "tasktest@test.com", password: "password123" });
        const res = await request(app)
            .post("/auth/login")
            .send({ email: "tasktest@test.com", password: "password123" });
        token = res.body.token;

        await request(app)
            .post("/auth/register")
            .send({ name: "Task Tester Other", email: "tasktest-other@test.com", password: "password123" });
        const otherRes = await request(app)
            .post("/auth/login")
            .send({ email: "tasktest-other@test.com", password: "password123" });
        otherToken = otherRes.body.token;

        // Tasks require a valid project, so create one owned by the first user
        const projectRes = await request(app)
            .post("/projects")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Task Test Project" });
        projectId = projectRes.body.id;
    });

    afterAll(async () => {
        await pool.query("DELETE FROM users WHERE email IN ('tasktest@test.com', 'tasktest-other@test.com')");
        await pool.end();
    });

    test("GET /tasks without token returns 401", async () => {
        const res = await request(app).get("/tasks");
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty("error");
    });

    test("GET /tasks returns a list", async () => {
        const res = await request(app)
            .get("/tasks")
            .set("Authorization", `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test("POST /tasks creates a task", async () => {
        const res = await request(app)
            .post("/tasks")
            .set("Authorization", `Bearer ${token}`)
            .send({ title: "Test task", description: "Test description", projectId });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("id");
        expect(res.body.title).toBe("Test task");
        expect(res.body.status).toBe("todo");
        createdTaskId = res.body.id;
    });

    test("POST /tasks without title returns 400", async () => {
        const res = await request(app)
            .post("/tasks")
            .set("Authorization", `Bearer ${token}`)
            .send({ description: "missing title", projectId });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("error");
    });

    test("POST /tasks without projectId returns 400", async () => {
        const res = await request(app)
            .post("/tasks")
            .set("Authorization", `Bearer ${token}`)
            .send({ title: "No project task" });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("error");
    });

    test("POST /tasks with unknown projectId returns 400", async () => {
        const res = await request(app)
            .post("/tasks")
            .set("Authorization", `Bearer ${token}`)
            .send({ title: "Bad project task", projectId: 999999 });
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("error");
    });

    test("GET /tasks/:id returns one task", async () => {
        const res = await request(app)
            .get(`/tasks/${createdTaskId}`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.id).toBe(createdTaskId);
    });

    test("GET /tasks/:id with unknown id returns 404", async () => {
        const res = await request(app)
            .get("/tasks/999999")
            .set("Authorization", `Bearer ${token}`);
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty("error");
    });

    test("PATCH /tasks/:id updates a task", async () => {
        const res = await request(app)
            .patch(`/tasks/${createdTaskId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ status: "in-progress" });
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe("in-progress");
    });

    test("PATCH /tasks/:id by a user with no access returns 403", async () => {
        const res = await request(app)
            .patch(`/tasks/${createdTaskId}`)
            .set("Authorization", `Bearer ${otherToken}`)
            .send({ status: "done" });
        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty("error");
    });

    test("PATCH /tasks/:id with unknown id returns 404", async () => {
        const res = await request(app)
            .patch("/tasks/999999")
            .set("Authorization", `Bearer ${token}`)
            .send({ status: "done" });
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty("error");
    });

    test("DELETE /tasks/:id by a user with no access returns 403", async () => {
        const res = await request(app)
            .delete(`/tasks/${createdTaskId}`)
            .set("Authorization", `Bearer ${otherToken}`);
        expect(res.statusCode).toBe(403);
        expect(res.body).toHaveProperty("error");
    });

    test("DELETE /tasks/:id with unknown id returns 404", async () => {
        const res = await request(app)
            .delete("/tasks/999999")
            .set("Authorization", `Bearer ${token}`);
        expect(res.statusCode).toBe(404);
        expect(res.body).toHaveProperty("error");
    });

    test("DELETE /tasks/:id deletes a task", async () => {
        const res = await request(app)
            .delete(`/tasks/${createdTaskId}`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.statusCode).toBe(200);

        const checkRes = await request(app)
            .get(`/tasks/${createdTaskId}`)
            .set("Authorization", `Bearer ${token}`);
        expect(checkRes.statusCode).toBe(404);
    });
});