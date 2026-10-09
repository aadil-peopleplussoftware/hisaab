using Hisaab.Application.Common.Interfaces;
using Hisaab.Infrastructure.Identity;
using Hisaab.Infrastructure.Persistence;
using Hisaab.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Hisaab.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        services.AddDataProtection();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddTransient<IDateTimeService, DateTimeService>();

        var provider = configuration.GetValue<string>("DatabaseProvider") ?? "PostgreSql";
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            if (string.Equals(provider, "Sqlite", StringComparison.OrdinalIgnoreCase))
            {
                var sqliteConn = connectionString ?? "Data Source=hisaab.db";
                options.UseSqlite(sqliteConn);
            }
            else
            {
                var pgConn = connectionString ?? "Host=localhost;Port=5432;Database=hisaab;Username=postgres;Password=postgres";
                options.UseNpgsql(pgConn, npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName);
                    npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3);
                });
            }
        });

        services.AddScoped<IApplicationDbContext>(provider =>
            provider.GetRequiredService<ApplicationDbContext>());

        // Identity Configuration according to Section 4
        services.AddIdentityCore<ApplicationUser>(options =>
        {
            // Password policy: >= 8 chars, complexity
            options.Password.RequiredLength = 8;
            options.Password.RequireDigit = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireNonAlphanumeric = true;

            // Lockout policy: 5 failed attempts = 15 min lockout
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.AllowedForNewUsers = true;

            options.User.RequireUniqueEmail = true;
            options.SignIn.RequireConfirmedEmail = true;
        })
        .AddRoles<ApplicationRole>()
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();

        // Health Checks
        services.AddHealthChecks()
            .AddDbContextCheck<ApplicationDbContext>(
                name: "database",
                tags: new[] { "ready" });

        return services;
    }
}
