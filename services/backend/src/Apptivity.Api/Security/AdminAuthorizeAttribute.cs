using Microsoft.AspNetCore.Authorization;

namespace Apptivity.Api.Security;

public sealed class AdminAuthorizeAttribute : AuthorizeAttribute
{
    public AdminAuthorizeAttribute()
    {
        Policy = "AdminOnly";
    }
}
