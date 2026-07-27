import request from "supertest";
import app from "../server";
import { pool } from "../db/pool";

describe("User Routes", () => {
    let userToken: string;
    let adminToken: string;

    beforeAll(async () => {
        // Create a regular user
        await pool.query("DELETE FROM users WHERE email IN ('regular@test.com', 'admin@test.com')");

        await request(app)
            .post("/auth/register")
            .send({ name: "Regular User", email: "regular@test.com", password: "password123" });
        const userRes = await request(app)
            .post("/auth/login")
            .send({ email: "regular@test.com", password: "password123" });
        userToken = userRes.body.token;

        // Create an admin user directly in the database
        await pool.query(
            `INSERT INTO users (name, email, password_hash, role)
             VALUES ('Admin User', 'admin@test.com', $1, 'admin')
             ON CONFLICT (email) DO NOTHING`,
            [await import("bcrypt").then(b => b.hash("password123", 10))]
        );
        const adminRes = await request(app)
            .post("/auth/login")
            .send({ email: "admin@test.com", password: "password123" });
        adminToken = adminRes.body.token;
    });

    afterAll(async () => {
        await pool.query("DELETE FROM users WHERE email IN ('regular@test.com', 'admin@test.com')");
        await pool.end();
    });

    test("GET /users without token returns 401", async () => {
        const res = await request(app).get("/users");
        expect(res.statusCode).toBe(401);
    });

    test("GET /users with regular user returns 403", async () => {
        const res = await request(app)
            .get("/users")
            .set("Authorization", `Bearer ${userToken}`);
        expect(res.statusCode).toBe(403);
    });

    test("GET /users with admin returns 200", async () => {
        const res = await request(app)
            .get("/users")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test("GET /users/:id with admin returns user", async () => {
        const usersRes = await request(app)
            .get("/users")
            .set("Authorization", `Bearer ${adminToken}`);
        const firstUser = usersRes.body[0];

        const res = await request(app)
            .get(`/users/${firstUser.id}`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("id");
        expect(res.body).not.toHaveProperty("password_hash");
    });

    test("GET /users/:id with regular user returns 403", async () => {
        const res = await request(app)
            .get("/users/1")
            .set("Authorization", `Bearer ${userToken}`);
        expect(res.statusCode).toBe(403);
    });
}); 