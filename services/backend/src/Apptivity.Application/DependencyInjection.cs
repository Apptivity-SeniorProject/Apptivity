using Apptivity.Application.Contracts.Auth;
<<<<<<< Updated upstream
using Apptivity.Application.Contracts.Chats;
using Apptivity.Application.Contracts.Devices;
using Apptivity.Application.Contracts.Events;
=======
using Apptivity.Application.Interfaces;
>>>>>>> Stashed changes
using Apptivity.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Apptivity.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
<<<<<<< Updated upstream
        services.AddScoped<IEventService, EventService>();
        services.AddScoped<IEventLifecycleService, EventLifecycleService>();
        services.AddScoped<IChatService, ChatService>();
        services.AddScoped<IDeviceService, DeviceService>();
=======
        services.AddScoped<IReviewService, ReviewService>();
        services.AddScoped<IEventReputationService, EventReputationService>();
        services.AddScoped<ReputationCalculator>();
>>>>>>> Stashed changes
        return services;
    }
}
