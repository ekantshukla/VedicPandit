using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using VedicPandit.Core.Interfaces;
using VedicPandit.Infrastructure.AI;
using VedicPandit.Infrastructure.Data;
using VedicPandit.Infrastructure.Knowledge;
using VedicPandit.Infrastructure.Muhurat;
using VedicPandit.Infrastructure.Panchang;
using VedicPandit.Infrastructure.Services;

namespace VedicPandit.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddVedicPanditInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var content = new ContentOptions();
        config.GetSection(ContentOptions.Section).Bind(content);
        services.AddSingleton(content);
        services.AddSingleton<IContentStore, JsonContentStore>();
        services.AddSingleton<IChatLog, FileChatLog>();

        services.Configure<ClaudeOptions>(config.GetSection(ClaudeOptions.Section));
        services.Configure<FreeAiOptions>(config.GetSection(FreeAiOptions.Section));
        // A free OpenAI-compatible model (Groq, Gemini, OpenRouter…) when FreeAI__ApiKey is set, otherwise Claude
        if (!string.IsNullOrWhiteSpace(config[$"{FreeAiOptions.Section}:ApiKey"]))
            services.AddHttpClient<IClaudeClient, OpenAiCompatClient>();
        else
            services.AddHttpClient<IClaudeClient, ClaudeClient>();

        services.AddSingleton<IPanchangEngine, PanchangEngine>();
        services.AddSingleton<IMuhuratEngine, MuhuratEngine>();
        services.AddSingleton<IScriptureRetriever, ScriptureRetriever>();
        services.AddSingleton<ConversationStore>();
        services.AddScoped<IPanditJiOrchestrator, PanditJiOrchestrator>();
        return services;
    }
}
