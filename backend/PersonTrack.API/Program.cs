using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using Serilog;
using Serilog.Events;
using PersonTrack.API.Data;
using PersonTrack.API.Filters;
using PersonTrack.API.Hubs;
using PersonTrack.API.Middleware;
using PersonTrack.API.Models;
using PersonTrack.API.Services;

// ── Serilog ───────────────────────────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.File(
        path: "logs/persontrack-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog();

// ── Database ──────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── JWT Auth ──────────────────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["JwtSettings:SecretKey"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["JwtSettings:Issuer"],
            ValidAudience            = builder.Configuration["JwtSettings:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };

        // SignalR sends the JWT via query string because WebSocket doesn't support headers
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var accessToken = ctx.Request.Query["access_token"];
                var path = ctx.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    ctx.Token = accessToken;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// ── Validation error format (Türkçe, ilk hata mesajını döner) ─────────────────
builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = ctx =>
    {
        var errors = ctx.ModelState
            .Where(e => e.Value?.Errors.Count > 0)
            .SelectMany(e => e.Value!.Errors.Select(x => x.ErrorMessage))
            .Where(msg => !string.IsNullOrWhiteSpace(msg))
            .ToList();

        return new Microsoft.AspNetCore.Mvc.ObjectResult(new
        {
            message = errors.FirstOrDefault() ?? "Girilen bilgiler geçersiz.",
            errors
        }) { StatusCode = 400 };
    };
});

// ── SignalR ───────────────────────────────────────────────────────────────────
builder.Services.AddSignalR();

// ── Services ──────────────────────────────────────────────────────────────────
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<ActivityLogService>();
builder.Services.AddHostedService<BirthdayWorker>();
builder.Services.AddHostedService<NotificationWorker>();

// ── Global Exception Handler ──────────────────────────────────────────────────
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// ── Controllers + Audit Filter ────────────────────────────────────────────────
builder.Services.AddControllers(options =>
{
    options.Filters.Add<AuditActionFilter>();
});

// ── Swagger / OpenAPI (Scalar UI) ─────────────────────────────────────────────
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((doc, ctx, _) =>
    {
        doc.Info.Title       = "PersonTrack API";
        doc.Info.Version     = "v1";
        doc.Info.Description = "PersonTrack kurumsal kişi & toplantı yönetim sistemi API'si";
        return Task.CompletedTask;
    });
});

// ── Rate Limiting ─────────────────────────────────────────────────────────────
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Global: 120 req/min per IP
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetSlidingWindowLimiter(
            ctx.Connection.RemoteIpAddress?.ToString() ?? "anon",
            _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit       = 120,
                Window            = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6
            }));

    // Strict: auth endpoints — 10 req/min per IP
    options.AddSlidingWindowLimiter("auth", opt =>
    {
        opt.PermitLimit       = 10;
        opt.Window            = TimeSpan.FromMinutes(1);
        opt.SegmentsPerWindow = 6;
    });
});

// ── Health Checks ─────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks()
    .AddSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")!,
        name:    "sqlserver",
        tags:    new[] { "db", "ready" });

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(
                  "http://localhost:5173",
                  "http://localhost:3000",
                  "http://localhost")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// ─────────────────────────────────────────────────────────────────────────────
var app = builder.Build();

app.UseSerilogRequestLogging(opts =>
{
    opts.MessageTemplate = "HTTP {RequestMethod} {RequestPath} → {StatusCode} ({Elapsed:0.0}ms)";
});

app.UseExceptionHandler();
app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// OpenAPI JSON + Scalar UI (only in Development or explicit enable)
app.MapOpenApi();
app.MapScalarApiReference(opts =>
{
    opts.Title  = "PersonTrack API";
    opts.Theme  = ScalarTheme.Purple;
    opts.DefaultHttpClient = new(ScalarTarget.JavaScript, ScalarClient.Fetch);
});

// Health check endpoints
app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

// ── Startup: migrate + seed ───────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db     = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

    const int maxRetries = 10;
    for (int attempt = 1; attempt <= maxRetries; attempt++)
    {
        try
        {
            db.Database.Migrate();

            if (!db.Users.Any(u => u.Role == "Admin"))
            {
                db.Users.Add(new User
                {
                    Username     = config["AdminSeed:Username"] ?? "admin",
                    Email        = config["AdminSeed:Email"]    ?? "admin@persontrack.local",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(config["AdminSeed:Password"] ?? "Admin123!"),
                    Role         = "Admin",
                    IsActive     = true
                });
                db.SaveChanges();
                Log.Information("Admin kullanıcısı oluşturuldu");
            }
            break;
        }
        catch (Exception ex) when (attempt < maxRetries)
        {
            Log.Warning("DB bağlantısı kurulamadı (deneme {Attempt}/{Max}): {Message}", attempt, maxRetries, ex.Message);
            Thread.Sleep(5000);
        }
    }
}

app.Run();
