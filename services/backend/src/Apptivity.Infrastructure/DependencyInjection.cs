using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Apptivity.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        _ = configuration;
        return services;
    }
}
