using Apptivity.Application.Contracts.Auth;
using Apptivity.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Apptivity.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        return services;
    }
}
