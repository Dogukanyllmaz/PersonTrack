using Microsoft.Extensions.Configuration;

namespace PersonTrack.Tests.Helpers;

public static class ConfigHelper
{
    public static IConfiguration CreateJwtConfig() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JwtSettings:SecretKey"] = "PersonTrackSuperSecretKeyForTesting123456789",
                ["JwtSettings:Issuer"] = "PersonTrackTest",
                ["JwtSettings:Audience"] = "PersonTrackTest",
                ["JwtSettings:ExpirationHours"] = "24",
            })
            .Build();
}
