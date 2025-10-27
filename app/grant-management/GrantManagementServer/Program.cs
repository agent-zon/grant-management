using Common.DTOs;
using GrantManagementServer.Mappers;
using GrantManagementServer;
using GrantManagementServer.Services;
using MetadataServer.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Serilog;
using System.Text.Json;
using Common.DTOs;
using GrantManagementServer.Entities;
using GrantManagementServer.Mappers;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// CORS (restored)
builder.Services.AddCors(o =>
{
    o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

Log.Logger = new LoggerConfiguration()
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.OpenTelemetry(options =>
    {
        options.Endpoint = builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"];
    })
    .CreateLogger();

builder.Services.AddLogging(loggingBuilder =>
{
    loggingBuilder.ClearProviders();
    loggingBuilder.AddSerilog(dispose: true);
});

builder.Services.AddHttpContextAccessor();
builder.Configuration.AddCommandLine(args);
builder.Configuration.AddEnvironmentVariables();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["OIDC_AUTHORITY"];
        options.Audience = builder.Configuration["OIDC_AUDIENCE"];
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true
        };
    });

builder.Services.AddAuthorization();

// Use SQLite for v01 (PostgreSQL in v02)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Data Source=/app/data/grants.db";
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

builder.Services.AddHostedService<EnsureDatabaseCreatedHostedService>();
builder.Services.AddHostedService<PoliciesSeederHostedService>();

var app = builder.Build();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseHttpsRedirection();

// Health
app.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }));

//  Tool policy endpoints (existing) -------------------------------------------------
app.MapGet("/agents/{agentId}/tools", async (string agentId, AppDbContext db) =>
{
    var policies = await db.ToolActivationPolicy
        .Where(s => s.AgentId == agentId)
        .Select(p => p.ToDto())
        .ToListAsync();
    return Results.Ok(policies);
});

app.MapGet("/agents/{agentId}/tools/{name}", async (string agentId, string name, AppDbContext db) =>
    await db.ToolActivationPolicy.FirstOrDefaultAsync(r => r.AgentId == agentId && r.ToolName == name) is { } tool ?
        Results.Ok(tool.ToDto()) :
        Results.NotFound());

app.MapPost("/agents/{agentId}/tools", async (string agentId, ToolPolicyDto dto, AppDbContext db) =>
{
    var entity = dto.ToEntity();
    entity.AgentId = agentId; // enforce route agent id
    db.ToolActivationPolicy.Add(entity);
    await db.SaveChangesAsync();
    return Results.Created($"/agents/{agentId}/tools/{entity.ToolName}", entity.ToDto());
});

app.MapPut("/agents/{agentId}/tools/{name}", async (string agentId, string name, ToolPolicyDto dto, AppDbContext db) =>
{
    var existing = await db.ToolActivationPolicy.FirstOrDefaultAsync(r => r.AgentId == agentId && r.ToolName == name);
    if (existing is null) return Results.NotFound();
    var updated = dto.ToEntity();
    // Ensure identity consistency
    existing.ToolName = updated.ToolName;
    existing.AgentId = agentId;
    existing.ExplicitConsentPolicy.RequiresExplicitConsent = updated.ExplicitConsentPolicy.RequiresExplicitConsent;
    existing.ExplicitConsentPolicy.ConsentExpiration = updated.ExplicitConsentPolicy.ConsentExpiration;

    await db.SaveChangesAsync();
    return Results.Ok(existing.ToDto());
});

app.MapDelete("/agents/{agentId}/tools/{name}", async (string agentId, string name, AppDbContext db) =>
{
    var tool = await db.ToolActivationPolicy.FirstOrDefaultAsync(r => r.AgentId == agentId && r.ToolName == name);
    if (tool is null) return Results.NotFound();
    db.ToolActivationPolicy.Remove(tool);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// Grants (DB-backed) --------------------------------------------------------------
app.MapGet("/grants", async (string? status, string? session_id, AppDbContext db) =>
{
    var now = DateTime.UtcNow;
    var expiring = await db.Grants.Where(g => g.Status == "active" && g.ExpiresAt != null && g.ExpiresAt < now).ToListAsync();
    if (expiring.Count > 0)
    {
        foreach (var g in expiring) { g.Status = "expired"; g.UpdatedAt = now; }
        await db.SaveChangesAsync();
    }
    var q = db.Grants.AsQueryable();
    if (!string.IsNullOrWhiteSpace(session_id)) q = q.Where(g => g.SessionId == session_id);
    if (!string.IsNullOrWhiteSpace(status) && status != "all")
        q = status == "expired" ? q.Where(g => g.Status == "expired") : q.Where(g => g.Status == status);
    var list = await q.OrderByDescending(g => g.CreatedAt).ToListAsync();
    return Results.Ok(list);
});

app.MapGet("/grants/{id}", async (string id, AppDbContext db) =>
    await db.Grants.FindAsync(id) is { } g ? Results.Ok(g) : Results.NotFound(new { message = "Grant not found" }));

app.MapPost("/grants", async (CreateGrantDto body, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(body.UserId) || string.IsNullOrWhiteSpace(body.Scope))
        return Results.BadRequest(new { message = "user_id and scope are required" });
    var entity = body.ToEntity();
    
    db.Grants.Add(entity);
    db.AuditLogs.Add(new AuditLogEntity { Action = "grant_created", GrantId = entity.Id, DetailsJson = JsonSerializer.Serialize(new { entity.Scope, entity.UserId, entity.SessionId }) });
    await db.SaveChangesAsync();
    return Results.Created($"/grants/{entity.Id}", entity);
});

app.MapPut("/grants/{id}", async (string id, UpdateGrantDto body, AppDbContext db) =>
{
    var g = await db.Grants.FindAsync(id);
    if (g is null) return Results.NotFound(new { message = "Grant not found" });
    body.ApplyUpdate(g);
    db.AuditLogs.Add(new AuditLogEntity { Action = "grant_updated", GrantId = g.Id, DetailsJson = JsonSerializer.Serialize(new { g.Scope }) });
    await db.SaveChangesAsync();
    return Results.Ok(g);
});

app.MapDelete("/grants/{id}", async (string id, AppDbContext db) =>
{
    var g = await db.Grants.FindAsync(id);
    if (g is null) return Results.NotFound(new { message = "Grant not found" });
    if (g.Status != "revoked")
    {
        g.Status = "revoked";
        g.UpdatedAt = DateTime.UtcNow;
        db.AuditLogs.Add(new AuditLogEntity { Action = "grant_revoked", GrantId = g.Id });
        await db.SaveChangesAsync();
    }
    return Results.NoContent();
});

// Grant Requests (renamed from Consent Requests) ----------------------------------
app.MapGet("/grant-requests", async (string? status, AppDbContext db) =>
{
    var q = db.GrantRequests.AsQueryable();
    if (!string.IsNullOrWhiteSpace(status))
    {
        if (!Enum.TryParse<GrantRequestStatus>(status, true, out var statusEnum))
            throw new ArgumentException("Invalid status, Possible values are <'pending'|'approved'|'denied'|'expired'>", nameof(status));
        
        q = q.Where(c => c.Status == statusEnum);
    }
    var list = await q.OrderByDescending(c => c.CreatedAt).ToListAsync();
    return Results.Ok(list);
});

app.MapPost("/grant-requests", async (CreateGrantRequestDto body, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(body.AgentId) || string.IsNullOrWhiteSpace(body.SessionId) || body.RequestedScopes is null || body.Tools is null)
        return Results.BadRequest(new { message = "agent_id, session_id, requested_scopes, tools required" });
    var entity = new GrantRequestEntity
    {
        AgentId = body.AgentId,
        SessionId = body.SessionId,
        RequestedScopes = body.RequestedScopes.ToList(),
        Tools = body.Tools.ToList(),
        WorkloadId = body.WorkloadId,
        Reason = body.Reason,
    };
    entity.AuthorizationLink = $"/grant-requests/{entity.Id}";
    db.GrantRequests.Add(entity);
    db.AuditLogs.Add(new AuditLogEntity { Action = "grant_request_created", DetailsJson = JsonSerializer.Serialize(new { entity.Id, entity.AgentId, entity.SessionId, entity.RequestedScopes }) });
    await db.SaveChangesAsync();
    return Results.Created($"/grant-requests/{entity.Id}", entity);
});

app.MapPost("/grant-requests/{id}/respond", async (string id, GrantRequestDecisionDto body, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(body.Status) || (body.Status != "approved" && body.Status != "denied"))
        return Results.BadRequest(new { message = "status must be approved or denied" });

    var req = await db.GrantRequests.FindAsync(id);
    if (req is null) return Results.NotFound(new { message = "Grant request not found" });
    if (req.Status != GrantRequestStatus.Pending) 
        return Results.Ok(new { success = true, status = req.Status });

    req.Status = Enum.Parse<GrantRequestStatus>(body.Status, true);
    req.DecisionTimestamp = DateTime.UtcNow;
    req.ApprovedScopes = body.ApprovedScopes?.ToList();
    req.DeniedScopes = body.DeniedScopes?.ToList();
    db.AuditLogs.Add(new AuditLogEntity { Action = "grant_request_decision", DetailsJson = JsonSerializer.Serialize(new { id, req.Status, req.ApprovedScopes, req.DeniedScopes }) });

    if (body.Status == "approved" && req.ApprovedScopes is { Count: > 0 })
    {
        var grant = new GrantEntity
        {
            UserId = "demo-user",
            Scope = string.Join(' ', req.ApprovedScopes),
            SessionId = req.SessionId,
            WorkloadId = req.WorkloadId,
            GrantDataJson = JsonSerializer.Serialize(new { grant_request_id = req.Id })
        };
        db.Grants.Add(grant);
        db.AuditLogs.Add(new AuditLogEntity { Action = "grant_created", GrantId = grant.Id, DetailsJson = JsonSerializer.Serialize(new { grant.Scope, grant.SessionId }) });
    }

    await db.SaveChangesAsync();
    return Results.Ok(new { success = true, status = req.Status });
});

// Audit ---------------------------------------------------------------------------
app.MapGet("/audit", async (string? grant_id, int? limit, AppDbContext db) =>
{
    var q = db.AuditLogs.AsQueryable();
    if (!string.IsNullOrWhiteSpace(grant_id)) q = q.Where(a => a.GrantId == grant_id);
    q = q.OrderByDescending(a => a.Timestamp);
    if (limit is > 0) q = q.Take(limit.Value);
    return Results.Ok(await q.ToListAsync());
});

app.Run();

