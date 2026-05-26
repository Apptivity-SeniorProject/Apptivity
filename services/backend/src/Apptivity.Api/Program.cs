using Apptivity.Api.Background;
using Apptivity.Api.Health;
using Apptivity.Api.Hubs;
using Apptivity.Api.Middlewares;
using Apptivity.Api.Options;
using Apptivity.Api.Security;
using Apptivity.Application;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Interfaces;
using Apptivity.Infrastructure;
using Apptivity.Infrastructure.Persistence;
using Apptivity.Infrastructure.Options;
using Apptivity.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Threading.RateLimiting;
using System.Text;
using System.Text.Json;

using DotNetEnv;

Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpContextAccessor();
builder.Services.AddMemoryCache();
builder.Services.AddSignalR();
builder.Services.AddHostedService<EventLifecycleWorker>();
builder.Services.Configure<RecommendationOptions>(builder.Configuration.GetSection(RecommendationOptions.SectionName));
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy())
    .AddCheck<DatabaseHealthCheck>("database");
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, cancellationToken) =>
    {
        var payload = Apptivity.Api.Common.ApiEnvelope<object?>.Failure(new[]
        {
            new ErrorDetail("RATE_429", "Too many requests.")
        }, context.HttpContext.TraceIdentifier);

        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsJsonAsync(payload, cancellationToken);
    };

    var userLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
    {
        if (!ShouldRateLimit(httpContext))
        {
            return RateLimitPartition.GetNoLimiter("user:no-limit");
        }

        var userKey = GetUserPartitionKey(httpContext);
        var (tokensPerMinute, tokenLimit) = GetUserLimit(httpContext);

        return RateLimitPartition.GetTokenBucketLimiter(
            partitionKey: userKey,
            factory: _ => new TokenBucketRateLimiterOptions
            {
                TokenLimit = tokenLimit,
                TokensPerPeriod = tokensPerMinute,
                ReplenishmentPeriod = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                AutoReplenishment = true
            });
    });

    var ipLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
    {
        if (!ShouldRateLimit(httpContext))
        {
            return RateLimitPartition.GetNoLimiter("ip:no-limit");
        }

        var ipKey = GetIpPartitionKey(httpContext);
        var (tokensPerMinute, tokenLimit) = GetIpLimit(httpContext);

        return RateLimitPartition.GetTokenBucketLimiter(
            partitionKey: ipKey,
            factory: _ => new TokenBucketRateLimiterOptions
            {
                TokenLimit = tokenLimit,
                TokensPerPeriod = tokensPerMinute,
                ReplenishmentPeriod = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                AutoReplenishment = true
            });
    });

    options.GlobalLimiter = PartitionedRateLimiter.CreateChained(userLimiter, ipLimiter);
});

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddScoped<IUserContextAccessor, UserContextAccessor>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();

builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IConfiguration>((options, configuration) =>
    {
        var jwtOptions = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() 
                         ?? throw new InvalidOperationException("Jwt options are missing.");

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = ClaimTypes.NameIdentifier,
            RoleClaimType = ClaimTypes.Role
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrWhiteSpace(accessToken) && path.StartsWithSegments("/hubs/chat"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                var identity = context.Principal?.Identity as ClaimsIdentity;
                var sub = context.Principal?.FindFirst("sub")?.Value;
                if (!string.IsNullOrWhiteSpace(sub))
                {
                    identity?.AddClaim(new Claim(ClaimTypes.NameIdentifier, sub));
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("StrictOrigins", policy =>
    {
        var corsOptions = builder.Configuration.GetSection(CorsOptions.SectionName).Get<CorsOptions>() ?? new CorsOptions();
        policy.WithOrigins(corsOptions.AllowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

if (builder.Environment.IsProduction())
{
    ValidateProductionConfiguration(builder.Configuration);
}

var app = builder.Build();

var autoMigrateOnStartup = app.Configuration.GetValue("Database:AutoMigrateOnStartup", true);
var isTestingEnvironment = app.Environment.IsEnvironment("Testing");
if (autoMigrateOnStartup && !isTestingEnvironment)
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment() || app.Environment.IsStaging())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}
app.UseCors("StrictOrigins");
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";

        var payload = new
        {
            status = report.Status.ToString(),
            service = "apptivity-backend",
            timestampUtc = DateTime.UtcNow,
            traceId = context.TraceIdentifier,
            checks = report.Entries.ToDictionary(
                x => x.Key,
                x => new
                {
                    status = x.Value.Status.ToString(),
                    description = x.Value.Description
                })
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
    }
});

app.Run();

static void ValidateProductionConfiguration(IConfiguration configuration)
{
    static string GetRequired(IConfiguration config, string key)
    {
        var value = config[key];
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidOperationException($"Missing required production configuration: {key}");
        }

        return value;
    }

    GetRequired(configuration, "ConnectionStrings:PostgreSql");
    GetRequired(configuration, "ConnectionStrings:Redis");
    GetRequired(configuration, "Jwt:SigningKey");
    GetRequired(configuration, "Cloudinary:CloudName");
    GetRequired(configuration, "Cloudinary:ApiKey");
    GetRequired(configuration, "Cloudinary:ApiSecret");

    var recommendedV6Enabled = configuration.GetValue<bool>("Recommendations:RecommendedV6Enabled", true);
    var killSwitchEnabled = configuration.GetValue<bool>("Recommendations:KillSwitchEnabled", false);

    if (recommendedV6Enabled && !killSwitchEnabled)
    {
        GetRequired(configuration, "Groq:ApiKey");
    }
}

static string GetUserPartitionKey(HttpContext context)
{
    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "anonymous";
    return $"user:{userId}";
}

static string GetIpPartitionKey(HttpContext context)
{
    var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    return $"ip:{ip}";
}

static bool HasNearbyQuery(HttpContext context)
{
    return context.Request.Query.TryGetValue("userLat", out var userLat)
        && context.Request.Query.TryGetValue("userLng", out var userLng)
        && !string.IsNullOrWhiteSpace(userLat.ToString())
        && !string.IsNullOrWhiteSpace(userLng.ToString());
}

static bool ShouldRateLimit(HttpContext context)
{
    return IsRecommendedPost(context) || IsNearbyEventsGet(context);
}

static bool IsRecommendedPost(HttpContext context)
{
    return HttpMethods.IsPost(context.Request.Method)
        && context.Request.Path.Equals("/api/events/recommended", StringComparison.OrdinalIgnoreCase);
}

static bool IsNearbyEventsGet(HttpContext context)
{
    return HttpMethods.IsGet(context.Request.Method)
        && context.Request.Path.Equals("/api/events", StringComparison.OrdinalIgnoreCase)
        && HasNearbyQuery(context);
}

static (int TokensPerMinute, int TokenLimit) GetUserLimit(HttpContext context)
{
    if (IsRecommendedPost(context))
    {
        return (30, 45);
    }

    return (60, 90);
}

static (int TokensPerMinute, int TokenLimit) GetIpLimit(HttpContext context)
{
    if (IsRecommendedPost(context))
    {
        return (120, 180);
    }

    return (240, 360);
}

public partial class Program;
