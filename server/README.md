# The Autumn - Spring Boot Backend (Prototype)

This folder contains a simple Spring Boot backend scaffold matching the front-end project.

Quick start (Windows):

1. Make sure you have MySQL running and a database `duyem` created.
2. Update `src/main/resources/application.properties` with your MySQL username/password.
3. Run the backend with Maven:

```cmd
cd backend\the_autumn
mvn spring-boot:run
```

Notes:
- This is a minimal prototype. Do not use plaintext passwords or the token mechanism in production.
- Authentication uses `X-Auth-Token` header (UUID tokens stored in `sessions` table).
- You can import `sql/seed_mysql_full.sql` to seed the database for local development.

API Endpoints (high level):
- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/logout
- GET /api/users/{id}
- POST /api/users/{id}/follow
- POST /api/users/{id}/unfollow
- GET /api/posts
- GET /api/posts/{id}
- POST /api/posts (authenticated)
- POST /api/posts/{id}/like (authenticated)
- POST /api/posts/{id}/unlike (authenticated)
- POST /api/comments (authenticated)
- GET /api/admin/reports?status=pending
- POST /api/admin/reports/{id}/resolve (admin)
- POST /api/admin/ban (admin)

Next steps:
- Add DTOs to return sanitized user data and remove passwords.
- Implement DTO mapping for endpoints.
- Add unit and integration tests.
- Add JWT and password hashing for production.
