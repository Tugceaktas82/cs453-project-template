# Checkpoint 2 - Reflection Answers

**1. What is the difference between authentication and authorization?**

Authentication is the process of verifying who a user is. In this project, when a user sends their email and password to the login endpoint, the server checks the credentials against the database. If they match, it returns a signed JWT. From that point on, every request includes the token in the Authorization header so the server can identify the user without asking for credentials again. Authorization is a different step that happens after authentication. It checks whether the user actually has permission to do what they are requesting. For example, a logged in user can create their own project, but if they try to delete someone else's project, the server returns 403 because they are not the owner. Being logged in is not enough on its own. 

**2. Why should passwords be hashed instead of stored directly?**

Storing passwords as plain text is dangerous because if the database is ever leaked or accessed by someone who should not have it, every single password is immediately readable. Hashing with bcrypt converts the password into a string that cannot be reversed back into the original. The hash is what gets stored, not the actual password. This means even if an attacker gets the database, they would have to brute force each hash to find the original passwords, which bcrypt makes intentionally slow. The plain text password is only ever in memory during the registration or login request and is never written to disk anywhere.

**3. What information did you include in your JWT, and why?**

The token includes the userId, email, and role of the user. The userId is the most important one because it is what the server uses to figure out which user is making a request and to filter data in the database queries. The email was added so the client does not need to make a separate API call just to display who is logged in. The role is included so the middleware can check whether the user is an admin without having to query the database on every single request. The password hash is never included in the token.

**4. What is the difference between a 401 response and a 403 response?**

A 401 response means the server cannot identify who the user is. This happens when the request has no Authorization header, or the token is expired, or the token signature does not match. The server is basically saying it has no idea who is making the request. A 403 response means the server knows who the user is but they do not have permission to do what they are trying to do. For example, a valid token from a regular user hitting the GET /users route returns 403 because that route is for admins only. The user is authenticated but not authorized.

**5. Where does your application perform role or ownership checks?**

Role checks are handled in the authorize middleware in src/middleware/authorize.ts. This middleware reads the userRole value that was attached to the request by the authenticate middleware and compares it to the required role. If they do not match, it returns 403 before the route handler even runs. Ownership checks happen in the service layer. In projectService, the updateProject and deleteProject functions add AND owner_id to the SQL WHERE clause when the user is not an admin. If no rows are affected, the route returns 403. Keeping these checks in the service layer instead of scattered through route handlers made the code easier to follow.

**6. How are users, projects, and tasks related in your database?**

Each project has an owner_id column that is a foreign key pointing to the users table. This means every project is owned by exactly one user. The project_members table handles the case where other users are added to a project. It has a project_id and a user_id column and a composite primary key so the same user cannot be added twice. Tasks have a project_id foreign key so they belong to a project, and they also have an assigned_to column that references users so a task can be assigned to someone. The foreign keys are set up with ON DELETE CASCADE for project relationships so if a project is deleted its tasks go with it, and ON DELETE SET NULL for assigned_to so deleting a user does not delete their tasks.

**7. What was the hardest part of adding authentication or authorization?**

The trickiest part was getting the 401 vs 403 behavior correct for the project PATCH and DELETE routes. The original getProjectById function filtered by membership, so if a non member tried to update a project they did not belong to, the query returned null and the route sent back 404. That was wrong because the project actually existed, the user just did not have permission to modify it. The fix was creating a separate getProjectByIdAdmin function that checks if the project exists without any membership filter. The route now calls that first to decide between 404 and 403, and then tries the actual update or delete to see if the user has permission.