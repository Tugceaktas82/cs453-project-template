import request from "supertest";
import app from "../server";
import { pool } from "../db/pool";

describe("Auth Routes", () => {
    const testEmail = "auth@test.com";
    const testPassword = "password123";

    afterAll(async () => {
        await pool.query("DELETE FROM users WHERE email = $1", [testEmail]);
        await pool.end();
    });

    test("POST /auth/register creates a user", async () => {
        const res = await request(app)
            .post("/auth/register")
            .send({ email: testEmail, password: testPassword });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty("id");
        expect(res.body.email).toBe(testEmail);
    });

    test("POST /auth/register with duplicate email returns 409", async () => {
        const res = await request(app)
            .post("/auth/register")
            .send({ email: testEmail, password: testPassword });
        expect(res.statusCode).toBe(409);
        expect(res.body).toHaveProperty("error");
    });

    test("POST /auth/register without email returns 400", async () => {
        const res = await request(app)
            .post("/auth/register")
            .send({ password: testPassword });
        expect(res.statusCode).toBe(400);
    });

    test("POST /auth/register with short password returns 400", async () => {
        const res = await request(app)
            .post("/auth/register")
            .send({ email: "short@test.com", password: "123" });
        expect(res.statusCode).toBe(400);
    });

    test("POST /auth/login returns token", async () => {
        const res = await request(app)
            .post("/auth/login")
            .send({ email: testEmail, password: testPassword });
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("token");
        expect(res.body).toHaveProperty("user");
        expect(res.body.user.email).toBe(testEmail);
    });

    test("POST /auth/login with wrong password returns 401", async () => {
        const res = await request(app)
            .post("/auth/login")
            .send({ email: testEmail, password: "wrongpassword" });
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty("error");
    });

    test("POST /auth/login with unknown email returns 401", async () => {
        const res = await request(app)
            .post("/auth/login")
            .send({ email: "nobody@test.com", password: testPassword });
        expect(res.statusCode).toBe(401);
    });
});