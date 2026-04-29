using Apptivity.Api.Common;
using Apptivity.Application.Common.Models;
using Apptivity.Application.Contracts.Events;
using Apptivity.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apptivity.Api.Controllers;

[ApiController]
[Route("api/v1/events")]
[Authorize]
public sealed class EventsController : ApiControllerBase
{
    private readonly IEventService _eventService;

    public EventsController(IEventService eventService)
    {
        _eventService = eventService;
    }

    [HttpGet]
    public async Task<IActionResult> GetPaged([FromQuery] EventStatus? status, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        var request = new PagedRequest { PageNumber = pageNumber, PageSize = pageSize };
        var result = await _eventService.GetPagedAsync(status, request, cancellationToken);
        return FromResult(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Organization")]
    public async Task<IActionResult> Create([FromBody] CreateEventRequest request, CancellationToken cancellationToken)
    {
        var result = await _eventService.CreateAsync(request, cancellationToken);
        return FromResult(result);
    }

    [HttpPatch("{eventId:guid}/status")]
    [Authorize(Roles = "Admin,Organization")]
    public async Task<IActionResult> ChangeStatus([FromRoute] Guid eventId, [FromBody] ChangeEventStatusRequest request, CancellationToken cancellationToken)
    {
        var result = await _eventService.ChangeStatusAsync(eventId, request, cancellationToken);
        return FromResult(result);
    }
}
