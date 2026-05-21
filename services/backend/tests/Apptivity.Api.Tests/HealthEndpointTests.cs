using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace Apptivity.Api.Tests;

public sealed class HealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public HealthEndpointTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task HealthEndpoint_ReturnsOk()
    {
        using var factory = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((context, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Jwt:SigningKey"] = "SuperSecretDummyKeyForTestingPurposesOnlyWhichIsAtLeast32BytesLong!",
                    ["Jwt:Issuer"] = "TestIssuer",
                    ["Jwt:Audience"] = "TestAudience",
                    ["ConnectionStrings:PostgreSql"] = "Host=localhost;Database=dummy;Username=dummy;Password=dummy",
                    ["Database:AutoMigrateOnStartup"] = "false"
                });
            });
        });

        using var client = factory.CreateClient();
        using var response = await client.GetAsync("/api/health");

        if (response.StatusCode != HttpStatusCode.OK)
        {
            var content = await response.Content.ReadAsStringAsync();
            Assert.Fail($"Expected OK but got {response.StatusCode}. Content: {content}");
        }

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
