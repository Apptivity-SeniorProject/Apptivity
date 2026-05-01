using Apptivity.Application.Interfaces;
using Apptivity.Infrastructure.External;
using Apptivity.Infrastructure.Options;
using Apptivity.Infrastructure.Persistence;
using Apptivity.Infrastructure.Repositories;
using Apptivity.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Apptivity.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<CorsOptions>(configuration.GetSection(CorsOptions.SectionName));
        services.Configure<FcmOptions>(configuration.GetSection(FcmOptions.SectionName));
        services.Configure<CloudinaryOptions>(configuration.GetSection(CloudinaryOptions.SectionName));

        services.AddDbContext<AppDbContext>((sp, options) =>
        {
            var config = sp.GetRequiredService<IConfiguration>();
            var connectionString = config.GetConnectionString("PostgreSql");
            options.UseNpgsql(connectionString);
        });

        services.AddStackExchangeRedisCache(options =>
        {
            options.InstanceName = "apptivity:";
        });
        services.AddOptions<Microsoft.Extensions.Caching.StackExchangeRedis.RedisCacheOptions>()
            .Configure<IConfiguration>((options, config) =>
            {
                options.Configuration = config.GetConnectionString("Redis");
                options.InstanceName = "apptivity:";
            });

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IOtpVerificationRepository, OtpVerificationRepository>();
        services.AddScoped<IEventRepository, EventRepository>();
        services.AddScoped<IEventBookmarkRepository, EventBookmarkRepository>();
        services.AddScoped<IParticipationRepository, ParticipationRepository>();
        services.AddScoped<IChatRepository, ChatRepository>();
        services.AddScoped<IDeviceTokenRepository, DeviceTokenRepository>();
        services.AddScoped<IReviewRepository, ReviewRepository>();
        services.AddScoped<IReputationRepository, ReputationRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddScoped<IPasswordHasher, PasswordHasherAdapter>();
        services.AddScoped<IFirebaseOtpVerifier, FirebaseOtpVerifier>();
        services.AddScoped<INotificationService, FirebaseNotificationService>();
        services.AddScoped<IImageService, CloudinaryImageService>();

        services.AddHttpClient(nameof(FirebaseNotificationService));

        return services;
    }
}
