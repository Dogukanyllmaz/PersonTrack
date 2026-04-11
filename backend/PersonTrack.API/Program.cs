using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PersonTrack.API.Data;
using PersonTrack.API.Models;
using PersonTrack.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// JWT Auth
var jwtSecret = builder.Configuration["JwtSettings:SecretKey"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
            ValidAudience = builder.Configuration["JwtSettings:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddHostedService<BirthdayWorker>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// CORS - allow React dev server and Docker nginx
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

var app = builder.Build();

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Apply migrations and seed admin user (with retry for Docker startup ordering)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    const int maxRetries = 10;
    for (int attempt = 1; attempt <= maxRetries; attempt++)
    {
        try
        {
            db.Database.Migrate();

            if (!db.Users.Any(u => u.Role == "Admin"))
            {
                var adminUser = new User
                {
                    Username = config["AdminSeed:Username"] ?? "admin",
                    Email = config["AdminSeed:Email"] ?? "admin@persontrack.local",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(config["AdminSeed:Password"] ?? "Admin123!"),
                    Role = "Admin",
                    IsActive = true
                };
                db.Users.Add(adminUser);
                db.SaveChanges();
                logger.LogInformation("Admin kullanıcısı oluşturuldu: {Email}", adminUser.Email);
            }
            break;
        }
        catch (Exception ex) when (attempt < maxRetries)
        {
            logger.LogWarning("Veritabanına bağlanılamadı (deneme {Attempt}/{Max}): {Message}",
                attempt, maxRetries, ex.Message);
            Thread.Sleep(5000);
        }
    }
}

app.Run();
