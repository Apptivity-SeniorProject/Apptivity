using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            status = "ok",
            service = "apptivity-backend",
            timestampUtc = DateTime.UtcNow
        });
    }
}
