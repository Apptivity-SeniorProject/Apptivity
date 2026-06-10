using Apptivity.Application.Contracts.Auth;
using Apptivity.Application.Contracts.Admin;
using Apptivity.Application.Contracts.Chats;
using Apptivity.Application.Contracts.ChatReports;
using Apptivity.Application.Contracts.Devices;
using Apptivity.Application.Contracts.Events;
using Apptivity.Application.Contracts.Feedback;
using Apptivity.Application.Contracts.Notifications;
using Apptivity.Application.Contracts.Profiles;
using Apptivity.Application.Contracts.Reports;
using Apptivity.Application.Contracts.Tags;
using Apptivity.Application.Interfaces;
using Apptivity.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Apptivity.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IEventService, EventService>();
        services.AddScoped<IEventLifecycleService, EventLifecycleService>();
        services.AddScoped<IChatService, ChatService>();
        services.AddScoped<IDeviceService, DeviceService>();
        services.AddScoped<IReviewService, ReviewService>();
        services.AddScoped<IEventReputationService, EventReputationService>();
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<IAdminService, AdminService>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<IChatReportService, ChatReportService>();
        services.AddScoped<INotificationHistoryService, NotificationHistoryService>();
        services.AddScoped<IFeedbackService, FeedbackService>();
        services.AddScoped<ITagService, TagService>();
        services.AddScoped<ReputationCalculator>();
        return services;
    }
}
