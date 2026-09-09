# Module 10 — Session 2: The Identity Handshake

## Exercise 2: HttpOnly auth cookie, XSRF double-submit, credentials interceptor, AuthService

### Why not localStorage?

`localStorage.getItem('auth_token')` is **one line of XSS** away from being
exfiltrated (forum posts, profiles, a compromised npm package). The handshake
here takes the token out of JavaScript reach entirely:

1. **HttpOnly cookie** — the .NET API sets `tms_auth` as `HttpOnly`; even
   malicious JS physically cannot read it. The browser attaches it to every
   request automatically.
2. **XSRF double-submit** — browsers also send cookies on cross-site requests,
   so we issue a *readable* `XSRF-TOKEN` cookie; Angular echoes it in an
   `X-XSRF-TOKEN` header on mutating requests. An external malicious site can't
   read the cookie across origins (SOP), so it can't forge the header.
3. **AuthService** — the session state wrapper (Angular Signals), never
   exposing raw tokens to DOM scripts.

Parts **A** and **B** are backend (.NET). Parts **C** and **D** live here and
were implemented, plus a styled login page so the whole flow is testable.

## Part A — Server-side cookie issuance (.NET, TmsApi repo)

Create the DTOs (`Application/.../Auth/`):

```csharp
public record LoginRequest(string Username, string Password);
public record UserProfileDto(string DisplayName, string Role);
```

`Controllers/AuthController.cs` (collapsed snippets):

```csharp
[ApiController]
[Route("api/{version:apiVersion}/auth")]
public class AuthController : ControllerBase
{
    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request,
                               [FromServices] IWebHostEnvironment env)
    {
        // Demo account for the M10 transport test (M12 adds Identity/BCrypt/JWT keys)
        if (request.Username == "admin" && request.Password == "Password123!")
        {
            var dummyJwt = "header.payload.signature-demo-token";
            Response.Cookies.Append("tms_auth", dummyJwt, new CookieOptions
            {
                HttpOnly = true,                  // JS cannot read this token
                Secure = !env.IsDevelopment(),    // HTTPS in prod; HTTP fine on localhost dev
                SameSite = SameSiteMode.Strict,
                Expires = DateTimeOffset.UtcNow.AddHours(2)
            });
            return Ok(new UserProfileDto("System Admin", "Admin"));
        }
        return Unauthorized(new { detail = "Invalid username or password." });
    }

    [HttpGet("me")]
    public IActionResult GetCurrentUser()
    {
        if (Request.Cookies.TryGetValue("tms_auth", out _))
            return Ok(new UserProfileDto("System Admin", "Admin"));
        return Unauthorized(new { detail = "Session expired or missing authentication cookie." });
    }
}
```

> `Secure = !env.IsDevelopment()` is deliberate: over plain HTTP localhost,
> `Secure = true` makes browsers reject the cookie instantly.

## Part B — Antiforgery middleware (.NET, TmsApi repo)

`Program.cs`:

```csharp
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-XSRF-TOKEN"; // matches Angular's default
});
```

After `app.UseAuthentication()` / `app.UseAuthorization()`:

```csharp
app.Use(async (context, next) =>
{
    if (context.User.Identity?.IsAuthenticated == true
        || context.Request.Cookies.ContainsKey("tms_auth"))
    {
        var antiforgery = context.RequestServices
            .GetRequiredService<IAntiforgery>();
        var tokens = antiforgery.GetAndStoreTokens(context);
        context.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!,
            new CookieOptions
            {
                HttpOnly = false,   // MUST be false so Angular JS can read it
                Secure = !builder.Environment.IsDevelopment(),
                SameSite = SameSiteMode.Strict
            });
    }
    await next(context);
});
```

The server validates the header against the cookie on every state-changing op.

## Part C — Credentials interceptor + XSRF handshake (this repo)

| File | Change |
| ---- | ------ |
| `src/app/interceptors/credentials.interceptor.ts` | **new** — `req.clone({ withCredentials: true })` on every request |
| `src/app/app.config.ts` | registered `withInterceptors` + `withXsrfConfiguration` |

```ts
export const credentialsInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ withCredentials: true }));

provideHttpClient(
  withInterceptors([credentialsInterceptor]),
  withXsrfConfiguration({
    cookieName: 'XSRF-TOKEN',   // cookie set by the .NET middleware
    headerName: 'X-XSRF-TOKEN', // header .NET validates
  }),
)
```

Effect: every `HttpClient` call now carries cookies, and Angular automatically
adds `X-XSRF-TOKEN` to all **POST/PUT/DELETE** requests (only when the cookie
exists and the request is same-origin — which our proxy makes true).

> Because the dev proxy makes `/api/...` requests same-origin to
> `localhost:4200`, the API's `Set-Cookie` headers land on the page's own domain
> and Angular can read `XSRF-TOKEN`. That is why the cookie flow works here
> despite the API living on another port.

## Part D — AuthService, cookie-backed session (this repo)

`src/app/services/auth.service.ts`:

```ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/auth`;

  currentUser = signal<TmsUser | null>(null);
  isAuthenticated = computed(() => this.currentUser() !== null);

  hasRole(role: string) {          // Admin outranks any specific role
    const user = this.currentUser();
    return user?.role === role || user?.role === 'Admin';
  }

  async login(credentials: LoginRequest) {
    await firstValueFrom(this.http.post<void>(`${this.base}/login`, credentials));
    const user = await firstValueFrom(this.http.get<TmsUser>(`${this.base}/me`));
    this.currentUser.set(user);    // raw tokens never touch JS
  }

  async restoreSession() { ... }   // re-check /me on app boot after refresh
  logout() { this.currentUser.set(null); }
}
```

**Transport vs. role authorization:** `AuthService` only tracks the session on
the client. Production route guards backed by ASP.NET Core Identity *claims*
arrive in Module 12.

> **Extra (beyond the lab, for testability):** a premium dark-glass `/login`
> page (`features/login/login.component`) matching the grade form aesthetic,
> plus a nav user chip (name/role + Log out) and `restoreSession()` at boot so a
> refresh keeps you signed in.

### Lab divergences

- Angular 22 dropped `@Service()` → `@Injectable({ providedIn: 'root' })`.
- The lab hardcodes `'/api/auth/login'`; this project stays env-driven
  (`${environment.apiUrl}/auth` → `/api/v1/auth`), so the backend's
  `{version:apiVersion}` route and the `environment.apiUrl` value must agree —
  flip `apiUrl` to `'/api'` in the two environment files if your API has no
  version segment.
- `logout()` / `restoreSession()` are additions (the lab has no logout flow).

### Verify

1. Apply Parts A+B, restart `dotnet run` + `ng serve` (proxy/cookies at boot).
2. Open `http://localhost:4200/login`, sign in `admin` / `Password123!`.
3. DevTools → **Application → Cookies** (`localhost:4200`):
   - `tms_auth` → **HttpOnly** ✓.
   - `XSRF-TOKEN` → HttpOnly blank (readable by Angular).
4. **Local Storage** → empty, no tokens.
5. Network tab → submit anything (e.g., an enrollment POST) → request headers
   contain `X-XSRF-TOKEN` matching the cookie value.

## Module 10 recap

| Session | Content | Commit |
| ------- | ------- | ------ |
| 1 | CORS named policy + environment-driven API URLs + CourseService | `0b7ca6d` |
| 2 | Identity handshake: HttpOnly cookie, XSRF, interceptor, AuthService | this session |
| 3 | pending | pending |