using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using PersonTrack.API.Services;

namespace PersonTrack.API.Filters;

/// <summary>
/// Automatically logs every state-changing API request (POST/PUT/DELETE/PATCH)
/// for authenticated users into the ActivityLog table.
/// </summary>
public class AuditActionFilter : IAsyncActionFilter
{
    // Controllers whose mutations we don't audit (low-value noise)
    private static readonly HashSet<string> _skipControllers = new(StringComparer.OrdinalIgnoreCase)
    {
        "Notifications", "Timeline"
    };

    // Map controller name → entity type label
    private static readonly Dictionary<string, string> _entityMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Persons"]      = "Person",
        ["Meetings"]     = "Meeting",
        ["Tasks"]        = "Task",
        ["Auth"]         = "Auth",
        ["Admin"]        = "User",
        ["Tags"]         = "Tag",
        ["Reminders"]    = "Reminder",
        ["ActivityLog"]  = "ActivityLog",
        ["Export"]       = "Export",
        ["Search"]       = "Search",
    };

    // Map (httpMethod, actionName) → friendly action label
    private static string ResolveAction(string method, string? actionName)
    {
        var action = actionName?.ToLowerInvariant();
        return action switch
        {
            "login"           => "Login",
            "logout"          => "Logout",
            "changepassword"  => "ChangePassword",
            "forgotpassword"  => "ForgotPassword",
            "resetpassword"   => "ResetPassword",
            "complete"        => "Complete",
            "import"          => "Import",
            "uploadphoto"     => "UploadPhoto",
            "deletephoto"     => "DeletePhoto",
            "uploaddocument"  => "UploadDocument",
            "deletedocument"  => "DeleteDocument",
            "addrelationship" => "AddRelationship",
            "removerelationship" => "RemoveRelationship",
            "addtoperson"     => "AddTagToPerson",
            "removefromperson"=> "RemoveTagFromPerson",
            "addtomeeting"    => "AddTagToMeeting",
            "removefrommeting"=> "RemoveTagFromMeeting",
            "toggleuseractive"=> "ToggleUserActive",
            "setuserrole"     => "SetUserRole",
            _ => method.ToUpperInvariant() switch
            {
                "POST"   => "Create",
                "PUT"    => "Update",
                "PATCH"  => "Update",
                "DELETE" => "Delete",
                _        => method
            }
        };
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var executed = await next();

        // Only audit mutating methods
        var method = context.HttpContext.Request.Method;
        if (method is "GET" or "HEAD" or "OPTIONS") return;

        // Only log authenticated users
        var userIdClaim = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId)) return;

        // Only log successful responses (2xx)
        var statusCode = executed.Result switch
        {
            CreatedAtActionResult  => 201,
            NoContentResult        => 204,
            OkResult               => 200,
            StatusCodeResult scr   => scr.StatusCode,
            ObjectResult obj       => obj.StatusCode ?? 200,
            _                      => 200
        };
        if (statusCode >= 400) return;

        context.ActionDescriptor.RouteValues.TryGetValue("controller", out var controllerName);
        controllerName ??= "";
        if (_skipControllers.Contains(controllerName)) return;

        context.ActionDescriptor.RouteValues.TryGetValue("action", out var actionName);
        var entityType    = _entityMap.GetValueOrDefault(controllerName, controllerName);
        var action        = ResolveAction(method, actionName);

        // Try to get entity ID from route
        int? entityId = null;
        if (context.RouteData.Values.TryGetValue("id", out var idVal) &&
            int.TryParse(idVal?.ToString(), out var parsedId))
            entityId = parsedId;

        // Build entity name: try response body, fall back to route info
        var entityName = TryExtractEntityName(executed.Result, entityType, entityId);

        // IP and User-Agent
        var ip        = context.HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = context.HttpContext.Request.Headers.UserAgent.ToString();
        if (userAgent.Length > 300) userAgent = userAgent[..300];

        // Details: path + query
        var path    = context.HttpContext.Request.Path.Value ?? "";
        var details = $"{method} {path}";

        try
        {
            var auditService = context.HttpContext.RequestServices.GetService<ActivityLogService>();
            if (auditService != null)
                await auditService.LogAsync(userId, entityType, entityId, entityName, action, details, ip, userAgent);
        }
        catch
        {
            // Audit logging must never break the main request
        }
    }

    private static string TryExtractEntityName(IActionResult? result, string entityType, int? entityId)
    {
        // Try to pull a "name" field from the response object via reflection
        if (result is ObjectResult { Value: not null } objResult)
        {
            var val = objResult.Value;
            var type = val.GetType();

            // Try common name properties
            foreach (var propName in new[] { "title", "fullName", "name", "username", "email", "firstName" })
            {
                var prop = type.GetProperty(propName, System.Reflection.BindingFlags.IgnoreCase | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
                if (prop != null)
                {
                    var propVal = prop.GetValue(val)?.ToString();
                    if (!string.IsNullOrEmpty(propVal)) return propVal;
                }
            }

            // Try id property for generic label
            var idProp = type.GetProperty("id", System.Reflection.BindingFlags.IgnoreCase | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
            if (idProp != null)
            {
                var idVal = idProp.GetValue(val)?.ToString();
                if (!string.IsNullOrEmpty(idVal)) return $"{entityType} #{idVal}";
            }
        }

        return entityId.HasValue ? $"{entityType} #{entityId}" : entityType;
    }
}
