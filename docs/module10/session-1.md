# Module 10 — Session 1: Breaking the CORS Lock

## Exercise 1: CORS policy, environment-driven API URLs, CourseService wiring

### Story primer

Browsers enforce the **Same-Origin Policy (SOP)**: `http://localhost:4200`
(Angular) and `http://localhost:5000` (API) are different *origins* because the
**ports differ**. Scalar/Postman succeed because they are backend utilities with
no SOP. Chrome silently keeps the Angular code from reading a response the
server already sent — the request fires, the API answers, and Chrome dumps the
answer. That is the CORS lock.

Parts **A** and **B** live in the .NET `TmsApi` repo (not this repo) — walk
throughs and snippets are below. Part **C** is the client side of this repo and
was implemented here.

## Part A — Diagnose the lock in DevTools

1. In `TmsApi`, comment out `app.UseCors("AllowAngular");`.
2. `dotnet run` (API terminal) + `ng serve` (Angular terminal).
3. Open `http://localhost:4200`, F12 → Network → clear log → navigate around.
4. The API call shows **red**; Console shows
   *"blocked by CORS policy"*. Note the subtlety: the server still processed the
   request — the browser just threw the response away.

## Part B — Named CORS policy in .NET 10

`appsettings.Development.json`:

```json
{
  "AllowedOrigins": [
    "http://localhost:4200"
  ]
}
```

`Program.cs` (service registration, before `builder.Build()`):

```csharp
var allowedOrigins = builder.Configuration
    .GetSection("AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:4200"];

// Named policy: origin list driven by config, never hardcoded in C#
builder.Services.AddCors(options =>
{
    options.AddPolicy("TmsClient", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials() // Vital for HttpOnly auth cookies in Session 2
              .SetPreflightMaxAge(TimeSpan.FromMinutes(10));
    });
});
```

Request pipeline (after `builder.Build()`):

```csharp
// CRITICAL: UseRouting -> UseCors -> UseAuthentication -> UseAuthorization
app.UseCors("TmsClient");
```

> **Security trap:** never combine `.AllowAnyOrigin()` with
> `.AllowCredentials()`. ASP.NET Core throws `InvalidOperationException` at
> startup — the browser spec bans wildcard origins for credentialed requests.

Restart the API (`Ctrl+C` → `dotnet run`); `Program.cs` changes need a full
process restart.

## Part C — Environment configs + CourseService (this repo)

| File | Change |
| ---- | ------ |
| `src/environments/environment.ts` | `{ production: true, apiUrl: '/api/v1' }` |
| `src/environments/environment.development.ts` | `{ production: false, apiUrl: '/api/v1' }` |
| `angular.json` | `ng generate environments` wired `fileReplacements` (environment.development.ts swaps in for `serve`) |
| `src/app/models/course.model.ts` | `status?: string;` added to `Course` |
| `src/app/services/course.service.ts` | env-driven base `apiUrl/courses`, `@Injectable` |

How the pieces fit:

- `ng generate environments` (Angular 22 doesn't ship these by default)
  scaffolded both files and added the `fileReplacements` block under the
  **development** build configuration, so `ng serve` compiles
  `environment.development.ts` while `ng build` (production) uses
  `environment.ts`.
- The **same source file shape** in both environments means one code path.
  `production` is a first-class property of the config, not injected
  magic.
- `CourseService` now derives everything from config:

```ts
private readonly base = `${environment.apiUrl}/courses`;

getAll() {
  return this.http
    .get<PagedResponse<Course>>(this.base, { params: { page: '1', pageSize: '50' } })
    .pipe(map(p => p.items));
}
```

- The client talks to **relative `/api/v1/...`** URLs → same-origin from the
  browser's point of view → the browser sends the request and happily reads the
  response. The dev proxy (`proxy.conf.json`, `/api` →
  `https://localhost:5001`, `secure: false`) forwards to the .NET API, and the
  named CORS policy is the backstop for any non-proxied/remote client.

> **Divergence from the lab:** Angular 22 dropped `@Service()`; the service uses
> `@Injectable({ providedIn: "root" })` (same effect). The lab shows only
> `getAll()`; the existing `getCourses/getCourseById/create/update/delete`
> methods were migrated to the env base too so the whole service is consistent.

### Verify

1. `dotnet run` + `ng serve` (restart both — env replace + proxy read at boot).
2. `/catalog` (or wherever courses render) → Network shows `GET /api/v1/courses`
   → **200 OK**, no red line, Console has no CORS error.
3. Inspect response headers → `access-control-allow-origin: http://localhost:4200`
   (proof the `TmsClient` policy is being applied).

## What's next

Session 2 covers what happens when Liya must *log in* — authentication,
HttpOnly cookies, XSRF tokens, and Angular interceptors.

## Module 10 recap

| Session | Content | Commit |
| ------- | ------- | ------ |
| 1 | CORS named policy + environment-driven API URLs + CourseService | this session |
| 2 | HttpOnly auth, XSRF, running requests | pending |
| 3 | pending | pending |