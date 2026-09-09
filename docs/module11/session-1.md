# Module 11 — Session 1: Hashing Mechanics & ASP.NET Core Identity Setup

> **Tier 1 — fully backend (.NET `TmsApi` repo).** No Angular code changes this
> session; the client-side auth rewire lands with the JWT/token story in M11
> Session 2.

## Exercise 1 — The mechanics of password hashing

### Why BCrypt

Plain text and unsalted hashes (raw MD5/SHA-256) are instant losses: rainbow
tables reverse them, and GPU/ASIC brute force runs billions/sec. BCrypt solves
both by **salting** (unique random salt per password → no two hashes of the same
password match → rainbow tables useless) and a **work factor** (deliberate key
expansion that costs real CPU time per guess).

### Step 1 — install the package (Infrastructure project)

```
dotnet add TmsApi.Infrastructure/TmsApi.Infrastructure.csproj package BCrypt.Net-Next
```

### Step 2 — cryptography service

`TmsApi.Infrastructure/Services/CryptoDemoService.cs`:

```csharp
namespace TmsApi.Infrastructure.Services;

public class CryptoDemoService
{
    public string HashUserPassword(string plainText)
    {
        // BCrypt auto-generates a unique salt and prepends it to the hash.
        // workFactor: 12 means 2^12 key expansion iterations.
        return BCrypt.Net.BCrypt.HashPassword(plainText, workFactor: 12);
    }

    public bool VerifyUserPassword(string plainText, string hashedDbPassword)
    {
        return BCrypt.Net.BCrypt.Verify(plainText, hashedDbPassword);
    }
}
```

### Step 3 — prove salt uniqueness (endpoint or test)

```csharp
var service = new CryptoDemoService();
string hash1 = service.HashUserPassword("Password123!");
string hash2 = service.HashUserPassword("Password123!");
// hash1 != hash2 entirely — unique random salts!
// Both verify true against the SAME plain text:
bool match1 = service.VerifyUserPassword("Password123!", hash1); // true
bool match2 = service.VerifyUserPassword("Password123!", hash2); // true
```

> **Decision rule:** never hand-roll hashing in production. From Exercise 2
> onward ASP.NET Core Identity's `UserManager` owns the pipeline (BCrypt,
> pepper handling, lockouts, password rehashing) for us.

## Exercise 2 — ASP.NET Core Identity setup

### Step 1 — extend IdentityUser

Install packages into the Infrastructure project:

```
cd TmsApi.Infrastructure/TmsApi.Infrastructure
dotnet add package Microsoft.Extensions.Identity.Stores
dotnet add package Microsoft.AspNetCore.Identity.EntityFrameworkCore
```

`TmsApi.Infrastructure/Identity/TmsUser.cs`:

```csharp
using Microsoft.AspNetCore.Identity;

namespace TmsApi.Infrastructure.Identity;

public class TmsUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Department { get; set; }
}
```

### Step 2 — switch the context to Identity

`TmsApi.Infrastructure/Persistence/TmsDbContext.cs`:

```csharp
namespace TmsApi.Infrastructure.Persistence;

public class TmsDbContext : IdentityDbContext<TmsUser>
{
    public TmsDbContext(DbContextOptions<TmsDbContext> options)
        : base(options) { }
}
```

Combined with the packages above = seven standard tables
(`AspNetUsers`, `AspNetRoles`, `AspNetRoleClaims`, `AspNetUserClaims`,
`AspNetUserLogins`, `AspNetUserRoles`, `AspNetUserTokens`).

### Step 3 — configure Identity with enterprise policies

`Program.cs` (service registration):

```csharp
builder.Services.AddIdentityCore<TmsUser>(options =>
{
    // Enterprise password policy
    options.Password.RequiredLength = 12;
    options.Password.RequireUppercase = true;
    options.Password.RequireDigit = true;
    options.Password.RequireNonAlphanumeric = true;

    // Brute-force lockout protection
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.AllowedForNewUsers = true;
})
.AddRoles<IdentityRole>()
.AddEntityFrameworkStores<TmsDbContext>();
```

### Step 4 — replace the M10 demo controller with Identity

> **Integration flag:** the M11 controller uses `[Route("api/[controller]")]` →
> `/api/auth/...` (no version segment). The M10 handshake used
> `api/{version:apiVersion}/auth` → `/api/v1/auth/...`, and the Angular
> `AuthService` still targets `${environment.apiUrl}/auth`. These will be
> reconciled in M11 Session 2 when the JWT/token flow is built — until then
> `Scalar`/HTTP clients hit the new endpoints directly.

`TmsApi.Api/Controllers/AuthController.cs`:

```csharp
namespace TmsApi.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<TmsUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;

    public AuthController(
        UserManager<TmsUser> userManager,
        RoleManager<IdentityRole> roleManager)
    {
        _userManager = userManager;
        _roleManager = roleManager;
    }

    public record RegisterRequest(
        string Email, string Password, string FirstName, string LastName, string Role);

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            // Prevent account enumeration — generic response for existing users
            return Ok(new { message = "Registration request received." });
        }

        var user = new TmsUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description);
            return BadRequest(new { errors });
        }

        if (!await _roleManager.RoleExistsAsync(request.Role))
        {
            await _roleManager.CreateAsync(new IdentityRole(request.Role));
        }
        await _userManager.AddToRoleAsync(user, request.Role);

        return Ok(new { message = "Registration successful." });
    }

    public record LoginRequest(string Email, string Password);

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            return Unauthorized(new { detail = "Invalid credentials." });
        }

        if (await _userManager.IsLockedOutAsync(user))
        {
            return StatusCode(423, new
            {
                detail = "Account locked due to multiple failed login attempts. Try again in 15 minutes."
            });
        }

        var validPassword = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!validPassword)
        {
            await _userManager.AccessFailedAsync(user);
            return Unauthorized(new { detail = "Invalid credentials." });
        }

        await _userManager.ResetAccessFailedCountAsync(user);
        return Ok(new
        {
            userId = user.Id,
            email = user.Email,
            firstName = user.FirstName,
            lastName = user.LastName
        });
    }
}
```

Security points worth noting:

- `CreateAsync` hashes with **BCrypt** and stores per-user salt — no plain text.
- Failed guesses accumulate via `AccessFailedAsync`; user is locked out at 5
  attempts (`MaxFailedAccessAttempts = 5`) for 15 minutes (423 Locked).
- Successful login runs `ResetAccessFailedCountAsync` to clear the counter.
- Register never leaks existence (account-enumeration defence).

### Step 5 — migrations

From the solution root:

```
dotnet ef migrations add AddIdentitySupport --project TmsApi.Infrastructure/TmsApi.Infrastructure.csproj --startup-project TmsApi.Api/TmsApi.Api.csproj
dotnet ef database update --project TmsApi.Infrastructure/TmsApi.Infrastructure.csproj --startup-project TmsApi.Api/TmsApi.Api.csproj
```

Expected: the migration creates the seven `AspNet*` tables.

## Verification checkpoint (Session 1)

1. **Register** — POST `https://localhost:5001/api/auth/register` body
   `{ "email": "leul.instructor@cotbe.edu.et", "password": "SecurePass123!", "firstName": "Leul", "lastName": "Gebre", "role": "Instructor" }` → **200 OK**.
2. **Password policy** — register with password `"short"` → **400 Bad Request**
   listing the policy violations.
3. **Lockout** — wrong password ×5 on `/api/auth/login` → next attempt returns
   **423 Locked** (try-again-in-15-minutes message).

## Module 11 recap

| Session | Content | Commit / status |
| ------- | ------- | --------------- |
| 1 | BCrypt mechanics + Identity setup (TmsUser, policies, lockout, migrations) | this session (backend-only) |
| 2 | pending | pending |
| 3 | pending | pending |