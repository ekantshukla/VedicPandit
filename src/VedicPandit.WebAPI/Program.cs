using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using VedicPandit.Core.Interfaces;
using VedicPandit.Infrastructure;
using VedicPandit.Infrastructure.AI;
using VedicPandit.WebAPI.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Hosts like Render, Railway and Azure set PORT; listen on it when present.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port)) builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.AddVedicPanditInfrastructure(builder.Configuration);

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddSignalR()
    .AddJsonProtocol(o => o.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddResponseCaching();

// Who may call the API from a browser: the local dev server, the GitHub Pages site, the Android app
// (Capacitor serves the app from https://localhost), plus anything in Cors:Origins / CORS_ORIGINS.
var origins = new List<string> { "http://localhost:4200", "https://localhost", "http://localhost", "capacitor://localhost" };
origins.AddRange(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? Array.Empty<string>());
origins.AddRange((Environment.GetEnvironmentVariable("CORS_ORIGINS") ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
builder.Services.AddCors(o => o.AddPolicy("spa", p => p.WithOrigins(origins.Distinct().ToArray()).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

// Protect the paid LLM endpoint from abuse: 20 chat requests / minute / IP (REST and SignalR)
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddPolicy("chat", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ClientIp(ctx),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(1) }));
});
builder.Services.AddSingleton<HubRateLimiter>();
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownNetworks.Clear();
    o.KnownProxies.Clear();
});

var app = builder.Build();

// Load content and warm the scripture index
var content = app.Services.GetRequiredService<IContentStore>();
await app.Services.GetRequiredService<IScriptureRetriever>().RebuildAsync();
var claude = app.Services.GetRequiredService<IClaudeClient>();
app.Logger.LogInformation("Content: {Verses} verses, {Mantras} mantras. PanditJi mode: {Mode}",
    content.AllVerses.Count(), content.Mantras.Count, claude.IsConfigured ? "Claude" : "offline (set Claude__ApiKey for full answers)");

app.UseForwardedHeaders();
app.UseCors("spa");
app.UseResponseCaching();
app.UseRateLimiter();

// Serve the built Angular app from wwwroot when it is there (single deployable; see README)
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();
app.MapHub<PanditJiHub>("/hubs/panditji");
app.MapGet("/api/health", (IClaudeClient c) => Results.Ok(new { status = "ok", ai = c.IsConfigured, time = DateTimeOffset.UtcNow }));
app.MapFallbackToFile("index.html");

app.Run();

static string ClientIp(HttpContext ctx) => ctx.Connection.RemoteIpAddress?.ToString() ?? "anon";

/// <summary>Make Program visible to the test project.</summary>
public partial class Program { }
