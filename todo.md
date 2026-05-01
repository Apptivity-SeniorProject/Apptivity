# Check-in System Architecture & Implementation Guide

This document outlines the design and steps required to implement the Event Check-in system using QR Codes.

## 1. Domain Additions
We need to track if a participant actually attended the event (No-Show prevention).
- In `Participation.cs` entity:
  - Add `bool IsCheckedIn { get; set; } = false;`
  - Add `DateTime? CheckedInAt { get; set; }`

## 2. DTOs
- `CheckInRequest`: Could just take a `Guid ParticipationId` (from the QR code) or `Guid EventId` and `Guid UserId`.

## 3. QR Code Generation (Client or Server Side)
- Mobile App or Web App generates a QR code containing `apptivity://check-in/{participationId}` or a JSON payload `{"eventId": "...", "userId": "..."}`.

## 4. API Endpoint (`EventsController`)
```csharp
[HttpPost("{eventId:guid}/check-in")]
[Authorize(Roles = "Organization,Admin")] // Only owners can scan check-ins
public async Task<IActionResult> CheckIn(Guid eventId, [FromBody] CheckInRequest request)
{
    // 1. Verify caller is the Owner of the event
    // 2. Find Participation by UserId & EventId
    // 3. Verify Participation.Status == Approved
    // 4. Update IsCheckedIn = true, CheckedInAt = DateTime.UtcNow
    // 5. SaveChangesAsync
}
```

## 5. Reputation Impact
Currently, reputation calculates based on Reviews. 
With Check-in implemented, you could also run a batch job or update reputation logic:
- If a user was `Approved` but `IsCheckedIn == false` (No-show), penalize their reputation score slightly.
- Reward users who consistently check in.
