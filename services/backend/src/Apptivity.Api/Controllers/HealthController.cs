using Apptivity.Api.Common;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/v1/health")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(ApiEnvelope<object>.Success(new
        {
            status = "ok",
            service = "apptivity-backend",
            timestampUtc = DateTime.UtcNow
        }));
    }
}
