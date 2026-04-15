using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace PersonTrack.API.Middleware;

/// <summary>
/// Catches all unhandled exceptions and returns RFC 7807 Problem Details responses.
/// Prevents stack traces from leaking to clients in production.
/// </summary>
public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;
    private readonly IHostEnvironment _env;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger, IHostEnvironment env)
    {
        _logger = logger;
        _env = env;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext context,
        Exception exception,
        CancellationToken cancellationToken)
    {
        _logger.LogError(exception,
            "Unhandled exception on {Method} {Path}",
            context.Request.Method,
            context.Request.Path);

        var (statusCode, title) = exception switch
        {
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Yetkisiz erişim"),
            KeyNotFoundException        => (StatusCodes.Status404NotFound,     "Kaynak bulunamadı"),
            ArgumentException           => (StatusCodes.Status400BadRequest,   "Geçersiz istek"),
            InvalidOperationException   => (StatusCodes.Status409Conflict,     "İşlem çakışması"),
            _                           => (StatusCodes.Status500InternalServerError, "Sunucu hatası")
        };

        var problem = new ProblemDetails
        {
            Status   = statusCode,
            Title    = title,
            Detail   = _env.IsDevelopment() ? exception.Message : "Beklenmedik bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
            Instance = context.Request.Path
        };

        problem.Extensions["traceId"] = context.TraceIdentifier;

        context.Response.StatusCode  = statusCode;
        context.Response.ContentType = "application/problem+json";

        await context.Response.WriteAsJsonAsync(problem, cancellationToken);
        return true;
    }
}
