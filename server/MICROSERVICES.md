# Microservice Target Architecture

This backend is currently a single Spring Boot monolith. The first safe step is to introduce a deployable microservice scaffold beside the current app, then migrate controllers, services, repositories, and database ownership service by service.

## Service Boundaries

| Service | Runtime port | Owns API paths | Current code to migrate |
| --- | ---: | --- | --- |
| api-gateway | 8080 | public entrypoint | route only, no business logic |
| identity-service (`service-auth`) | 8081 | `/api/auth/**`, `/api/users/**`, `/api/sessions/**`, `/api/devices/**` | `AuthController`, `UserController`, `SessionController`, `DeviceController`, auth/user/session/device services and repositories |
| content-service | 8082 | `/api/posts/**`, `/api/posts-like/**`, `/api/comments/**`, `/api/saved-posts/**` | post, like, comment, saved-post controllers/services/repositories/entities |
| communication-service (`service-chat`) | 8083 | `/api/chat/**`, `/ws/**` | chat, message, conversation, video-call code and Redis message cache |
| notification-service | 8084 | `/api/notifications/**` | notification controller/service/repository/entity |
| reputation-service | 8085 | `/api/badges/**`, `/api/leaderboard/**` | badge and leaderboard code |
| moderation-service (`service-admin`) | 8086 | `/api/reports/**`, `/api/admin/**` | report, ban, admin-action, permission/admin workflows |
| catalog-service | 8087 | `/api/majors/**`, `/api/subject/**` | major and subject controllers/repositories/entities |

## Shared Runtime

- All business services load shared config from `microservices/service-common/src/main/resources/application-common.yml`.
- All services use the same online TiDB connection through `TIDB_URL`, `TIDB_USERNAME`, `TIDB_PASSWORD`.
- All services use the same Redis instance through `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`.
- JWT auth is shared in `service-common`: identity-service issues tokens, other services validate locally with the same `JWT_SECRET`.

## Per-Service File Layout

Each business service should follow one shape so a feature only lives in one place:

```text
service-name/
  controller/   -> REST/WebSocket entrypoints
  service/      -> use cases and orchestration
  repository/   -> TiDB access owned by that service
  domain/       -> entity/aggregate owned by that service
  dto/          -> API request/response contracts
  config/       -> service-local overrides only
```

Examples:

- `identity-service` owns login/register/google-login/session/device/user-profile.
- `communication-service` owns conversation/message/message-cache/video-call.
- `moderation-service` owns report/ban/admin-action/role-permission/user-permission.

## Migration Order

1. Keep the existing `server` monolith as the reference implementation.
2. Run `server/microservices/api-gateway` on port `8080` so the client can keep the same API base URL.
3. Move one domain at a time from the monolith into its service module.
4. Replace cross-service direct repository calls with HTTP clients or async events.
5. Split database ownership after code ownership is clean. Do not share write access to the same tables across services.

## Data Ownership

| Data owner | Tables/entities |
| --- | --- |
| identity-service | `users`, `sessions`, `devices`, `email_verification_tokens`, `password_reset_tokens`, user privacy/session data |
| content-service | `posts`, `post_likes`, `comments`, `saved_posts`, `tags`, `post_tags`, attachments |
| communication-service | `conversations`, `conversation_participants`, `messages`, `message_reactions`, `video_calls`, Redis chat cache |
| notification-service | `notifications` |
| reputation-service | `badges`, `user_badges`, `leaderboard` |
| moderation-service | `reports`, `bans`, `admin_actions`, `role_permissions`, `user_permissions` |
| catalog-service | `majors`, `subjects` |

## Cross-Service Rules

- A service may read/write only its owned database tables.
- Shared auth should be JWT-based. Services validate JWTs locally; only identity-service issues/revokes tokens.
- Shared Redis should be used for hot data, rate limit, OTP/session helper data, and chat cache.
- Content events such as post created, post liked, comment created, badge awarded, and report resolved should become events later.
- Keep external paths stable through the gateway while internal service URLs change.

## Redis Chat Pattern

`communication-service` now contains a cache-aside skeleton:

1. Read messages from Redis first.
2. If cache miss, read from TiDB.
3. Put the page back into Redis with TTL.
4. When a new message is saved, write to TiDB first.
5. Evict the cached pages for that conversation so the next read refills them.

This is the safe starting point before adding stream/event driven fan-out.

## Local Development

The scaffold lives in `server/microservices`. It is intentionally separate from the monolith so migration can be incremental.

```powershell
cd server/microservices
docker compose up --build
```

Gateway URL stays:

```text
http://localhost:8080
```
