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
                ""Goals"" boolean NOT NULL DEFAULT true,
                ""UpdatedAtUtc"" timestamp with time zone NOT NULL,
                CONSTRAINT ""PK_user_deletion_settings"" PRIMARY KEY (""Id"")
            );

            ALTER TABLE user_deletion_settings ADD COLUMN IF NOT EXISTS ""Goals"" boolean NOT NULL DEFAULT true;

            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_user_deletion_settings_UserId"" ON user_deletion_settings (""UserId"");

            CREATE TABLE IF NOT EXISTS financial_goals (
                ""Id"" uuid NOT NULL,
                ""UserId"" uuid NOT NULL,
                ""Title"" character varying(200) NOT NULL,
                ""Description"" character varying(1000),
                ""Category"" integer NOT NULL DEFAULT 10,
                ""TargetAmount"" numeric(18,2) NOT NULL,
                ""CurrentAmount"" numeric(18,2) NOT NULL DEFAULT 0,
                ""TargetDate"" timestamp with time zone,
                ""Priority"" integer NOT NULL DEFAULT 2,
                ""Status"" integer NOT NULL DEFAULT 1,
                ""Color"" character varying(30),
                ""Icon"" character varying(50),
                ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                ""UpdatedAtUtc"" timestamp with time zone,
                ""CreatedBy"" uuid,
                ""UpdatedBy"" uuid,
                ""RowVersion"" bigint NOT NULL DEFAULT 0,
                ""IsDeleted"" boolean NOT NULL DEFAULT false,
                ""DeletedAtUtc"" timestamp with time zone,
                ""DeletedBy"" uuid,
                ""ImportBatchId"" uuid,
                CONSTRAINT ""PK_financial_goals"" PRIMARY KEY (""Id"")
            );

            CREATE INDEX IF NOT EXISTS ""IX_financial_goals_UserId_Status"" ON financial_goals (""UserId"", ""Status"");
            CREATE INDEX IF NOT EXISTS ""IX_financial_goals_UserId_Category"" ON financial_goals (""UserId"", ""Category"");
            CREATE INDEX IF NOT EXISTS ""IX_financial_goals_UserId_Priority"" ON financial_goals (""UserId"", ""Priority"");
            CREATE INDEX IF NOT EXISTS ""IX_financial_goals_UserId_TargetDate"" ON financial_goals (""UserId"", ""TargetDate"");

            CREATE TABLE IF NOT EXISTS goal_contributions (
                ""Id"" uuid NOT NULL,
                ""GoalId"" uuid NOT NULL,
                ""UserId"" uuid NOT NULL,
                ""Amount"" numeric(18,2) NOT NULL,
                ""ContributionDate"" timestamp with time zone NOT NULL,
                ""Source"" character varying(150),
                ""Notes"" character varying(500),
                ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                ""UpdatedAtUtc"" timestamp with time zone,
                ""CreatedBy"" uuid,
                ""UpdatedBy"" uuid,
                ""RowVersion"" bigint NOT NULL DEFAULT 0,
                ""IsDeleted"" boolean NOT NULL DEFAULT false,
                ""DeletedAtUtc"" timestamp with time zone,
                ""DeletedBy"" uuid,
                ""ImportBatchId"" uuid,
                CONSTRAINT ""PK_goal_contributions"" PRIMARY KEY (""Id""),
                CONSTRAINT ""FK_goal_contributions_financial_goals_GoalId"" FOREIGN KEY (""GoalId"") REFERENCES financial_goals (""Id"") ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS ""IX_goal_contributions_GoalId_ContributionDate"" ON goal_contributions (""GoalId"", ""ContributionDate"");
            CREATE INDEX IF NOT EXISTS ""IX_goal_contributions_UserId_ContributionDate"" ON goal_contributions (""UserId"", ""ContributionDate"");

            -- Refresh Tokens Long-Lived Session & Family Tracking
            ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS ""FamilyId"" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
            ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS ""IsRememberMe"" boolean NOT NULL DEFAULT true;
            CREATE INDEX IF NOT EXISTS ""IX_refresh_tokens_FamilyId"" ON refresh_tokens (""FamilyId"");

            -- AI Stock Holdings Table
            CREATE TABLE IF NOT EXISTS stock_holdings (
                ""Id"" uuid NOT NULL,
                ""UserId"" uuid NOT NULL,
                ""Ticker"" character varying(50) NOT NULL,
                ""CompanyName"" character varying(200) NOT NULL,
                ""Exchange"" character varying(20) NOT NULL DEFAULT 'NSE',
                ""BuyPrice"" numeric(18,2) NOT NULL,
                ""Quantity"" numeric(18,4) NOT NULL,
                ""PurchaseDate"" timestamp with time zone NOT NULL,
                ""TargetProfitPerShare"" numeric(18,2),
                ""TargetPrice"" numeric(18,2),
                ""StopLossPrice"" numeric(18,2),
                ""Notes"" character varying(1000),
                ""IsArchived"" boolean NOT NULL DEFAULT false,
                ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                ""UpdatedAtUtc"" timestamp with time zone,
                ""CreatedBy"" uuid,
                ""UpdatedBy"" uuid,
                ""RowVersion"" bigint NOT NULL DEFAULT 0,
                ""IsDeleted"" boolean NOT NULL DEFAULT false,
                ""DeletedAtUtc"" timestamp with time zone,
                ""DeletedBy"" uuid,
                ""ImportBatchId"" uuid,
                CONSTRAINT ""PK_stock_holdings"" PRIMARY KEY (""Id"")
            );

            CREATE INDEX IF NOT EXISTS ""IX_stock_holdings_UserId_Ticker"" ON stock_holdings (""UserId"", ""Ticker"");
            CREATE INDEX IF NOT EXISTS ""IX_stock_holdings_UserId_IsArchived"" ON stock_holdings (""UserId"", ""IsArchived"");

            -- Market Agent Settings & Alert Logs
            CREATE TABLE IF NOT EXISTS market_agent_user_settings (
                ""Id"" uuid NOT NULL,
                ""UserId"" uuid NOT NULL,
                ""WhatsAppPhoneNumber"" character varying(50),
                ""EmailAddress"" character varying(200),
                ""EnablePreMarketScan"" boolean NOT NULL DEFAULT true,
                ""EnableTargetHitAlerts"" boolean NOT NULL DEFAULT true,
                ""EnableStopLossAlerts"" boolean NOT NULL DEFAULT true,
                ""EnableEmailDispatch"" boolean NOT NULL DEFAULT true,
                ""EnableWhatsAppDispatch"" boolean NOT NULL DEFAULT true,
                ""PreMarketScanTime"" character varying(10) NOT NULL DEFAULT '08:45',
                ""LastPreMarketReportDate"" character varying(20),
                ""LastSentinelScanUtc"" timestamp with time zone,
                ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                ""UpdatedAtUtc"" timestamp with time zone,
                ""CreatedBy"" uuid,
                ""UpdatedBy"" uuid,
                ""RowVersion"" bigint NOT NULL DEFAULT 0,
                ""IsDeleted"" boolean NOT NULL DEFAULT false,
                ""DeletedAtUtc"" timestamp with time zone,
                ""DeletedBy"" uuid,
                ""ImportBatchId"" uuid,
                CONSTRAINT ""PK_market_agent_user_settings"" PRIMARY KEY (""Id"")
            );

            CREATE INDEX IF NOT EXISTS ""IX_market_agent_user_settings_UserId"" ON market_agent_user_settings (""UserId"");

            CREATE TABLE IF NOT EXISTS market_agent_alert_logs (
                ""Id"" uuid NOT NULL,
                ""UserId"" uuid NOT NULL,
                ""Ticker"" character varying(50) NOT NULL,
                ""CompanyName"" character varying(200) NOT NULL,
                ""AlertType"" character varying(50) NOT NULL,
                ""Title"" character varying(250) NOT NULL,
                ""Message"" text NOT NULL,
                ""TriggerPrice"" numeric(18,2) NOT NULL DEFAULT 0,
                ""TargetPrice"" numeric(18,2),
                ""ProfitOrLossAmount"" numeric(18,2),
                ""WhatsAppStatus"" character varying(50) NOT NULL DEFAULT 'Pending',
                ""EmailStatus"" character varying(50) NOT NULL DEFAULT 'Pending',
                ""WhatsAppClickUrl"" text,
                ""CreatedAtUtc"" timestamp with time zone NOT NULL,
                ""UpdatedAtUtc"" timestamp with time zone,
                ""CreatedBy"" uuid,
                ""UpdatedBy"" uuid,
                ""RowVersion"" bigint NOT NULL DEFAULT 0,
                ""IsDeleted"" boolean NOT NULL DEFAULT false,
                ""DeletedAtUtc"" timestamp with time zone,
                ""DeletedBy"" uuid,
                ""ImportBatchId"" uuid,
                CONSTRAINT ""PK_market_agent_alert_logs"" PRIMARY KEY (""Id"")
            );

            CREATE INDEX IF NOT EXISTS ""IX_market_agent_alert_logs_UserId_CreatedAtUtc"" ON market_agent_alert_logs (""UserId"", ""CreatedAtUtc"");
            CREATE INDEX IF NOT EXISTS ""IX_market_agent_alert_logs_UserId_Ticker"" ON market_agent_alert_logs (""UserId"", ""Ticker"");

            CREATE TABLE IF NOT EXISTS attachments (
                ""Id"" uuid NOT NULL,
                ""FileName"" character varying(255) NOT NULL,
                ""OriginalFileName"" character varying(255) NOT NULL,
                ""ContentType"" character varying(100) NOT NULL,
                ""FileSizeBytes"" bigint NOT NULL,
                ""FilePath"" character varying(1000) NOT NULL,
                ""FileUrl"" character varying(1000),
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
                CONSTRAINT ""PK_attachments"" PRIMARY KEY (""Id"")
            );

            CREATE INDEX IF NOT EXISTS ""IX_attachments_UserId_CreatedAtUtc"" ON attachments (""UserId"", ""CreatedAtUtc"");

            ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ""AttachmentId"" uuid;
            ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ""AttachmentUrl"" character varying(1000);
            ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ""AttachmentFileName"" character varying(255);
            ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ""AttachmentFileType"" character varying(100);
            ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ""AttachmentFileSize"" bigint;

            -- Role Rights Table
            CREATE TABLE IF NOT EXISTS role_rights (
                ""Id"" uuid NOT NULL,
                ""RoleName"" character varying(100) NOT NULL,
                ""Module"" character varying(100) NOT NULL,
                ""CanView"" boolean NOT NULL DEFAULT true,
                ""CanCreate"" boolean NOT NULL DEFAULT true,
                ""CanEdit"" boolean NOT NULL DEFAULT true,
                ""CanDelete"" boolean NOT NULL DEFAULT true,
                ""CanExport"" boolean NOT NULL DEFAULT true,
                ""UpdatedAtUtc"" timestamp with time zone NOT NULL,
                CONSTRAINT ""PK_role_rights"" PRIMARY KEY (""Id"")
            );

            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_role_rights_RoleName_Module"" ON role_rights (""RoleName"", ""Module"");
        ");
    }
    catch
    {
        // Ignored for non-Postgres providers (e.g. SQLite test runners)
    }

    // Initialize default roles and module rights
    try
    {
        var roleRightsService = scope.ServiceProvider.GetRequiredService<Hisaab.Application.Common.Interfaces.IRoleRightsService>();
        await roleRightsService.GetRolesAsync();
    }
    catch
    {
        // Ignored during startup if not ready
    }
}

// Middleware Pipeline
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("EnableSwagger", true))
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

app.UseDefaultFiles();
app.UseStaticFiles();

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
app.MapFallbackToFile("index.html");

app.Run();

public partial class Program { }
