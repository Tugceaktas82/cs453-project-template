import request from "supertest";
import app from "../server";
import { pool } from "../db/pool";

describe("Task API Routes", () => {
    let token: string;
    let createdTaskId: number;

    beforeAll(async () => {
        // Test kullanıcısı oluştur ve token al
        await pool.query("DELETE FROM users WHERE email = 'tasktest@test.com'");
        const reg = await request(app)
            .post("/auth/register")
            .send({ email: "tasktest@test.com", password: "password123" });
        token = (await request(app)
            .post("/auth/login")
            .send({ email: "tasktest@test.com", password: "password123" })).body.token;
    });

    afterAll(async () => {
        await pool.query("DELETE FROM users WHERE email = 'tasktest@test.com'");
        await pool.end();
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
            .send({ title: "Test task", description: "Test description" });
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
            .send({ description: "missing title" });
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

    test("GET /tasks without token returns 401", async () => {
        const res = await request(app).get("/tasks");
        expect(res.statusCode).toBe(401);
    });
});