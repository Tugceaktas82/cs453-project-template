import request from "supertest";
import app from "../server";
import { pool } from "../db/pool";

describe("Project Routes", () => {
    let token: string;
    let createdProjectId: number;

    beforeAll(async () => {
        await pool.query("DELETE FROM users WHERE email = 'projtest@test.com'");
        await request(app)
            .post("/auth/register")
            .send({ email: "projtest@test.com", password: "password123" });
        const res = await request(app)
            .post("/auth/login")
            .send({ email: "projtest@test.com", password: "password123" });
        token = res.body.token;
    });

    afterAll(async () => {
        await pool.query("DELETE FROM users WHERE email = 'projtest@test.com'");
        await pool.end();
    });

    test("GET /projects returns a list", async () => {
        const res = await request(app)
            .get("/projects")
            .set("Authorization", `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test("POST /projects creates a project", async () => {
        const res = await request(app)
            .post("/projects")
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Test Project" });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("id");
        expect(res.body.name).toBe("Test Project");
        createdProjectId = res.body.id;
    });

    test("POST /projects without name returns 400", async () => {
        const res = await request(app)
            .post("/projects")
            .set("Authorization", `Bearer ${token}`)
            .send({});
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("error");
    });

    test("GET /projects/:id returns one project", async () => {
        const res = await request(app)
            .get(`/projects/${createdProjectId}`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.id).toBe(createdProjectId);
    });

    test("GET /projects/:id with unknown id returns 404", async () => {
        const res = await request(app)
            .get("/projects/999999")
            .set("Authorization", `Bearer ${token}`);
        expect(res.statusCode).toBe(404);
    });

    test("PATCH /projects/:id updates a project", async () => {
        const res = await request(app)
            .patch(`/projects/${createdProjectId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ name: "Updated Project" });
        expect(res.statusCode).toBe(200);
        expect(res.body.name).toBe("Updated Project");
    });

    test("DELETE /projects/:id deletes a project", async () => {
        const res = await request(app)
            .delete(`/projects/${createdProjectId}`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.statusCode).toBe(200);

        const checkRes = await request(app)
            .get(`/projects/${createdProjectId}`)
            .set("Authorization", `Bearer ${token}`);
        expect(checkRes.statusCode).toBe(404);
    });

    test("GET /projects without token returns 401", async () => {
        const res = await request(app).get("/projects");
        expect(res.statusCode).toBe(401);
    });
});