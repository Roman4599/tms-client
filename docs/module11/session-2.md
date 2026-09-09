# Module 11 — Session 2: JWT Bearer Authentication & Refresh Token Rotation

> **Tier 2 — fully backend (.NET `TmsApi` repo).** The lab's Client Integration
> Note defers every Angular change (in-memory `accessToken` +
> `jwtInterceptor`) to **Session 3, Exercise 6**. No client code changes here.

## Exercise 3 — JWT generation & bearer pipeline

### Step 1 — settings & user secrets

`appsettings.Development.json`:

```json
{
  "Jwt": {
    "Issuer": "https://localhost:5001",
    "Audience": "tms-client",
    "ExpiryMinutes": 15
  }
}
```

The signing key never lives in source control — store it in **User Secrets**:

```
dotnet user-secrets set "Jwt:Key" "A-Very-Long-Secret-Key-For-TMS-Auth-Stored-Safely-2026"
```

### Step 2 — `TokenService`

`TmsApi.Infrastructure/Services/TokenService.cs`:

```csharp
namespace TmsApi.Infrastructure.Services;

public class TokenService
{
    private readonly IConfiguration _config;

    public TokenService(IConfiguration config) => _config = config;

    public string GenerateJwt(TmsUser user, IList<string> roles)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
            new Claim("FirstName", user.FirstName)
        };
        foreach (var role in roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(
                int.Parse(_config["Jwt:ExpiryMinutes"]!)),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

Notes: identity claims (`sub` via `NameIdentifier`, `email`, `FirstName`) plus
every role as `ClaimTypes.Role`; signed HMAC-SHA256 with the secret from User
Secrets; short 15-minute lifetime (limits theft blast radius).

### Step 3 — authentication pipeline

`Program.cs`:

```csharp
builder.Services.AddScoped<TokenService>();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
    };
});
```

Ensure the pipeline order is `UseCors → UseAuthentication → UseAuthorization`
(with `app.UseAuthentication();` before `app.UseAuthorization();`).

## Exercise 4 — Refresh token rotation & theft detection

### Step 1 — `RefreshToken` entity + migration

`TmsApi.Domain.Entities/RefreshToken.cs`:

```csharp
namespace TmsApi.Domain.Entities;

public class RefreshToken
{
    public int Id { get; set; }
    public string Token { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; }
    public bool IsRevoked { get; set; }
}
```

Add to `TmsDbContext`:

```csharp
public DbSet<RefreshToken> RefreshTokens { get; set; }
```

Migrate:

```
dotnet ef migrations add AddRefreshTokens --project TmsApi.Infrastructure/TmsApi.Infrastructure.csproj --startup-project TmsApi.Api/TmsApi.Api.csproj
dotnet ef database update --project TmsApi.Infrastructure/TmsApi.Infrastructure.csproj --startup-project TmsApi.Api/TmsApi.Api.csproj
```

### Step 2 — updated `AuthController` (login + refresh)

Inject `TmsDbContext` and `TokenService` alongside `UserManager` /
`RoleManager`. **`login`** now verifies the `UserManager` password, then
issues an access token **plus** an initial opaque `RefreshToken`
(7-day expiry, `IsUsed = false`), returning both in the body:

```csharp
var roles = await _userManager.GetRolesAsync(user);
var accessToken = _tokenService.GenerateJwt(user, roles);

var refreshToken = new RefreshToken
{
    Token = Guid.NewGuid().ToString("N"),
    UserId = user.Id,
    ExpiresAt = DateTime.UtcNow.AddDays(7),
    IsUsed = false,
    IsRevoked = false
};
_context.RefreshTokens.Add(refreshToken);
await _context.SaveChangesAsync();

return Ok(new { accessToken, refreshToken = refreshToken.Token });
```

**`refresh`** implements rotation + single-use validation:

```csharp
[HttpPost("refresh")]
public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
{
    var storedToken = await _context.RefreshTokens
        .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken);

    if (storedToken == null)
        return Unauthorized(new { detail = "Invalid refresh token." });

    // THEFT DETECTION: an already-used token means someone is replaying it —
    // revoke every session for that user.
    if (storedToken.IsUsed)
    {
        var userTokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == storedToken.UserId).ToListAsync();
        foreach (var t in userTokens) t.IsRevoked = true;
        await _context.SaveChangesAsync();
        return Unauthorized(new { detail = "Token theft detected. All user sessions revoked." });
    }

    if (storedToken.IsRevoked || storedToken.ExpiresAt < DateTime.UtcNow)
        return Unauthorized(new { detail = "Refresh token expired or revoked." });

    // Rotation: burn the current token, mint a fresh pair.
    storedToken.IsUsed = true;
    var newRefreshToken = new RefreshToken
    {
        Token = Guid.NewGuid().ToString("N"),
        UserId = storedToken.UserId,
        ExpiresAt = DateTime.UtcNow.AddDays(7),
        IsUsed = false,
        IsRevoked = false
    };
    _context.RefreshTokens.Add(newRefreshToken);
    await _context.SaveChangesAsync();

    var user = await _userManager.FindByIdAsync(storedToken.UserId);
    var roles = await _userManager.GetRolesAsync(user!);
    var newAccessToken = _tokenService.GenerateJwt(user!, roles);

    return Ok(new { accessToken = newAccessToken, refreshToken = newRefreshToken.Token });
}
```

### Client integration note (token migration from M10)

M10's cookie-only transport relied on the browser's implicit `Set-Cookie`.
The M11 flow returns `{ accessToken, refreshToken }` **explicitly in the JSON
body**. Angular updates happen in **Session 3 (Exercise 6)**:

- `AuthService` will hold the access token **in memory** (never
  localStorage — it dies on refresh, defeating XSS exfiltration).
- A `jwtInterceptor` will attach `Authorization: Bearer <accessToken>` to
  outgoing requests, and a refresh path will rotate tokens via
  `/api/auth/refresh`.
- The route mismatch flagged in S1 (`api/[controller]` → `/api/auth/...`
  vs the client's env-driven `/api/v1/auth`) is resolved during that rewire.

## Verification checkpoint (Session 2)

1. **Login & claims** — `POST /api/auth/login` → body carries `accessToken` +
   `refreshToken`. Paste the access token into <https://jwt.ms>: verify `sub`,
   `email`, `role`, and `exp` (15 min).
2. **Rotation** — `POST /api/auth/refresh` with the refresh token → NEW access +
   refresh token returned.
3. **Theft revocation** — resend the now-**used** old refresh token → **401**
   `"Token theft detected. All user sessions revoked."`; in the DB, all
   `RefreshTokens` for that user have `IsRevoked = 1`.

## Module 11 recap

| Session | Content | Commit / status |
| ------- | ------- | --------------- |
| 1 | BCrypt mechanics + Identity setup (TmsUser, policies, lockout, migrations) | `7c136ac` (backend) |
| 2 | JWT bearer + refresh rotation + theft detection | this session (backend) |
| 3 | Angular AuthService rework, `jwtInterceptor`, guards (Exercise 6 area) | pending |