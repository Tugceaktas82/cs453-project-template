import request from "supertest";
import app from "../server";
import { pool } from "../db/pool";

describe("Project Routes", () => {
    let ownerToken: string;
    let otherToken: string;
    let createdProjectId: number;

    beforeAll(async () => {
        // Create owner user
        await pool.query("DELETE FROM users WHERE email IN ('owner@test.com', 'other@test.com')");

        await request(app)
            .post("/auth/register")
            .send({ name: "Owner", email: "owner@test.com", password: "password123" });
        const ownerRes = await request(app)
            .post("/auth/login")
            .send({ email: "owner@test.com", password: "password123" });
        ownerToken = ownerRes.body.token;

        // Create another user
        await request(app)
            .post("/auth/register")
            .send({ name: "Other", email: "other@test.com", password: "password123" });
        const otherRes = await request(app)
            .post("/auth/login")
            .send({ email: "other@test.com", password: "password123" });
        otherToken = otherRes.body.token;
    });

    afterAll(async () => {
        await pool.query("DELETE FROM users WHERE email IN ('owner@test.com', 'other@test.com')");
        await pool.end();
    });

    test("GET /projects without token returns 401", async () => {
        const res = await request(app).get("/projects");
        expect(res.statusCode).toBe(401);
    });

    test("GET /projects returns a list", async () => {
        const res = await request(app)
            .get("/projects")
            .set("Authorization", `Bearer ${ownerToken}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test("POST /projects creates a project", async () => {
        const res = await request(app)
            .post("/projects")
            .set("Authorization", `Bearer ${ownerToken}`)
            .send({ name: "Test Project", description: "A test project" });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("id");
        expect(res.body.name).toBe("Test Project");
        createdProjectId = res.body.id;
    });

    test("POST /projects without name returns 400", async () => {
        const res = await request(app)
            .post("/projects")
            .set("Authorization", `Bearer ${ownerToken}`)
            .send({});
        expect(res.statusCode).toBe(400);
    });

    test("GET /projects/:id returns one project", async () => {
        const res = await request(app)
            .get(`/projects/${createdProjectId}`)
            .set("Authorization", `Bearer ${ownerToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.id).toBe(createdProjectId);
    });

    test("GET /projects/:id with unknown id returns 404", async () => {
        const res = await request(app)
            .get("/projects/999999")
            .set("Authorization", `Bearer ${ownerToken}`);
        expect(res.statusCode).toBe(404);
    });

    test("PATCH /projects/:id updates a project", async () => {
        const res = await request(app)
            .patch(`/projects/${createdProjectId}`)
            .set("Authorization", `Bearer ${ownerToken}`)
            .send({ name: "Updated Project" });
        expect(res.statusCode).toBe(200);
        expect(res.body.name).toBe("Updated Project");
    });

    test("PATCH /projects/:id by non-owner returns 403", async () => {
        const res = await request(app)
            .patch(`/projects/${createdProjectId}`)
            .set("Authorization", `Bearer ${otherToken}`)
            .send({ name: "Hacked" });
        expect(res.statusCode).toBe(403);
    });

    test("DELETE /projects/:id by non-owner returns 403", async () => {
        const res = await request(app)
            .delete(`/projects/${createdProjectId}`)
            .set("Authorization", `Bearer ${otherToken}`);
        expect(res.statusCode).toBe(403);
    });

    test("DELETE /projects/:id deletes a project", async () => {
        const res = await request(app)
            .delete(`/projects/${createdProjectId}`)
            .set("Authorization", `Bearer ${ownerToken}`);
        expect(res.statusCode).toBe(200);
    });
});