using System.Text.RegularExpressions;
using System.Threading.Channels;
using GrantMcpLayer;
using GrantMcpLayer.Interceptors;
using GrantMcpLayer.McpProxy;
using GrantMcpLayer.Models;
using GrantMcpLayer.Services;
using Serilog;

var builder = WebApplication.CreateBuilder(args);
builder.AddServiceDefaults();
Console.WriteLine("Starting Grant Management MCP Layer...");

Log.Logger = new LoggerConfiguration()
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.OpenTelemetry(options => { options.Endpoint = builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]; })
    .CreateLogger();

builder.Services.AddLogging(loggingBuilder =>
{
    loggingBuilder.ClearProviders();
    loggingBuilder.AddSerilog(dispose: true);
});

builder.Services.AddHttpClient();
builder.Services.AddHttpContextAccessor();
builder.Configuration.AddCommandLine(args);
builder.Configuration.AddEnvironmentVariables();

var consentRequestChannel = Channel.CreateUnbounded<DeviceFlowAuthRequestedEvent>(new UnboundedChannelOptions
{
    SingleReader = false,
    SingleWriter = false,
});
builder.Services.AddSingleton<ChannelReader<DeviceFlowAuthRequestedEvent>>(consentRequestChannel.Reader);
builder.Services.AddSingleton<ChannelWriter<DeviceFlowAuthRequestedEvent>>(consentRequestChannel.Writer);

builder.Services.AddHostedService<TokenRequestHostedService>();
builder.Services.AddHostedService<ClearOldConsentsHostedService>();

// builder.Services.AddSingleton<IGrantManagementClient, GrantManagementsClient>();

builder.AddNpgsqlDbContext<AppDbContext>("user-2-agent-consent-db");

builder.AddMcpProxy();

// builder.Services.AddHttpClient<IGrantManagementClient, GrantManagementsClient>(static client =>
// {
//     client.BaseAddress = new Uri("http://GrantManagementServer");
// });

var app = builder.Build();

app.MapDefaultEndpoints();

app.UseMcpProxy();
Console.WriteLine("Grant Management MCP Layer at: {0}", String.Join("," ,app.Urls ));
app.Logger.LogInformation("Starting Grant MCP Layer at: {0}", String.Join(",", app.Urls ));
await app.RunAsync();
