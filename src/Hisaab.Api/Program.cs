using System.Text.Json;
using Hisaab.Api.Middleware;
using Hisaab.Application;
using Hisaab.Infrastructure;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Register Core Layers
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// CORS configuration (allow Angular SPA)
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:4200", "http://localhost:8080", "https://localhost:4200" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("HisaabCorsPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Controllers & JSON configuration
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Hisaab API",
        Version = "v1",
        Description = "Hisaab Enterprise Personal Finance Web API — Clean Architecture (.NET 8)"
    });

    // JWT Bearer Swagger Authentication
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Ensure Database schema exists
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<Hisaab.Infrastructure.Persistence.ApplicationDbContext>();
    await dbContext.Database.EnsureCreatedAsync();

    // Ensure business tables exist if added after initial database creation
    try
    {
        await dbContext.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS businesses (
                ""Id"" uuid NOT NULL,
                ""UserId"" uuid NOT NULL,
                ""Name"" character varying(200) NOT NULL,
                ""LegalName"" character varying(200),
                ""Type"" integer NOT NULL,
                ""Currency"" character varying(10) NOT NULL,
                ""TaxId"" character varying(50),
                ""Description"" character varying(1000),
                ""IsActive"" boolean NOT NULL DEFAULT true,
                ""Color"" character varying(20),
                ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                ""UpdatedAtUtc"" timestamp with time zone,
                ""CreatedBy"" uuid,
                ""UpdatedBy"" uuid,
                ""RowVersion"" bigint NOT NULL DEFAULT 0,
                ""IsDeleted"" boolean NOT NULL DEFAULT false,
                ""DeletedAtUtc"" timestamp with time zone,
                ""DeletedBy"" uuid,
                ""ImportBatchId"" uuid,
                CONSTRAINT ""PK_businesses"" PRIMARY KEY (""Id"")
            );

            CREATE INDEX IF NOT EXISTS ""IX_businesses_UserId_IsActive"" ON businesses (""UserId"", ""IsActive"");
            CREATE INDEX IF NOT EXISTS ""IX_businesses_UserId_Name"" ON businesses (""UserId"", ""Name"");

            CREATE TABLE IF NOT EXISTS business_transactions (
                ""Id"" uuid NOT NULL,
                ""BusinessId"" uuid NOT NULL,
                ""Type"" integer NOT NULL,
                ""Category"" character varying(100) NOT NULL,
                ""Amount"" numeric(18,2) NOT NULL,
                ""TaxRatePercent"" numeric(5,2) NOT NULL DEFAULT 0,
                ""TaxAmount"" numeric(18,2) NOT NULL DEFAULT 0,
                ""TotalAmount"" numeric(18,2) NOT NULL,
                ""TransactionDate"" timestamp with time zone NOT NULL,
                ""Counterparty"" character varying(150) NOT NULL,
                ""InvoiceNumber"" character varying(100),
                ""DueDate"" timestamp with time zone,
                ""PaymentStatus"" integer NOT NULL,
                ""PaymentMethod"" character varying(100),
                ""Description"" character varying(1000),
                ""AttachmentUrl"" character varying(500),
                ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                ""UpdatedAtUtc"" timestamp with time zone,
                ""CreatedBy"" uuid,
                ""UpdatedBy"" uuid,
                ""RowVersion"" bigint NOT NULL DEFAULT 0,
                ""UserId"" uuid NOT NULL,
                ""IsDeleted"" boolean NOT NULL DEFAULT false,
                ""DeletedAtUtc"" timestamp with time zone,
                ""DeletedBy"" uuid,
                ""ImportBatchId"" uuid,
                CONSTRAINT ""PK_business_transactions"" PRIMARY KEY (""Id""),
                CONSTRAINT ""FK_business_transactions_businesses_BusinessId"" FOREIGN KEY (""BusinessId"") REFERENCES businesses (""Id"") ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS ""IX_business_transactions_BusinessId"" ON business_transactions (""BusinessId"");
            CREATE INDEX IF NOT EXISTS ""IX_business_transactions_UserId_BusinessId_TransactionDate"" ON business_transactions (""UserId"", ""BusinessId"", ""TransactionDate"");
            CREATE INDEX IF NOT EXISTS ""IX_business_transactions_UserId_Type"" ON business_transactions (""UserId"", ""Type"");
            CREATE INDEX IF NOT EXISTS ""IX_business_transactions_UserId_PaymentStatus"" ON business_transactions (""UserId"", ""PaymentStatus"");

            CREATE TABLE IF NOT EXISTS user_deletion_settings (
                ""Id"" uuid NOT NULL,
                ""UserId"" uuid NOT NULL,
                ""Transactions"" boolean NOT NULL DEFAULT true,
                ""Categories"" boolean NOT NULL DEFAULT true,
                ""Loans"" boolean NOT NULL DEFAULT true,
                ""Epfo"" boolean NOT NULL DEFAULT true,
                ""Investments"" boolean NOT NULL DEFAULT true,
                ""Business"" boolean NOT NULL DEFAULT true,
                ""UpdatedAtUtc"" timestamp with time zone NOT NULL,
                CONSTRAINT ""PK_user_deletion_settings"" PRIMARY KEY (""Id"")
            );

            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_user_deletion_settings_UserId"" ON user_deletion_settings (""UserId"");
        ");
    }
    catch
    {
        // Ignored for non-Postgres providers (e.g. SQLite test runners)
    }
}

// Middleware Pipeline
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Hisaab API v1");
        c.RoutePrefix = "swagger";
    });
}
else
{
    app.UseHsts();
}

app.UseCors("HisaabCorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

// Health Check Endpoints
app.MapHealthChecks("/health", new HealthCheckOptions
{
    Predicate = _ => false, // Liveness: basic ping
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var response = new
        {
            status = "Healthy",
            timestamp = DateTime.UtcNow,
            environment = app.Environment.EnvironmentName
        };
        await context.Response.WriteAsJsonAsync(response);
    }
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"), // Readiness: checks DB
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var response = new
        {
            status = report.Status.ToString(),
            duration = report.TotalDuration.TotalMilliseconds,
            timestamp = DateTime.UtcNow,
            checks = report.Entries.Select(e => new
            {
                name = e.Key,
                status = e.Value.Status.ToString(),
                description = e.Value.Description,
                duration = e.Value.Duration.TotalMilliseconds
            })
        };
        await context.Response.WriteAsJsonAsync(response);
    }
});

app.MapControllers();

app.Run();

public partial class Program { }
