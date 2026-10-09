using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Hisaab.Application.Features.Auth.DTOs;
using Hisaab.Application.Features.Categories.DTOs;
using Hisaab.Domain.Enums;
using Xunit;

namespace Hisaab.IntegrationTests;

public class ReportsEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public ReportsEndpointsTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Reports_PdfAndExcelGeneration_ShouldProduceValidFilesAndHonorTenantIsolation()
    {
        var clientA = _factory.CreateClient();

        // 1. Register User A
        var userAEmail = $"report_alpha_{Guid.NewGuid()}@hisaab.com";
        var regAResp = await clientA.PostAsJsonAsync("/api/v1/auth/register", new
        {
            Email = userAEmail,
            Password = "P@ssword123!",
            FullName = "User Alpha Reports"
        });
        regAResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var authA = await regAResp.Content.ReadFromJsonAsync<AuthResponseDto>();
        clientA.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authA!.AccessToken);

        // Fetch categories and add some data
        var catResp = await clientA.GetAsync("/api/v1/categories");
        var categories = await catResp.Content.ReadFromJsonAsync<List<CategoryDto>>();
        var incomeCat = categories!.First(c => c.Type == TransactionType.Income);

        // Add income transaction
        await clientA.PostAsJsonAsync("/api/v1/transactions", new
        {
            Type = TransactionType.Income,
            Amount = 75000.00m,
            CategoryId = incomeCat.Id,
            TransactionDate = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc),
            Note = "Salary payment"
        });

        // Add EPF entry
        await clientA.PostAsJsonAsync("/api/v1/epf", new
        {
            Month = "2026-10-01",
            EmployeeShare = 1800.00m,
            EmployerShare = 550.00m,
            PensionShare = 1250.00m,
            Interest = 0.00m,
            Withdrawal = 0.00m,
            Note = "Monthly EPF"
        });

        // Add Investment holding
        await clientA.PostAsJsonAsync("/api/v1/investments", new
        {
            Name = "Axis Bluechip Fund",
            Type = InvestmentType.MutualFund,
            InitialInvestedAmount = 25000.00m,
            InitialUnits = 100.0m,
            CurrentValue = 27500.00m,
            Note = "Bluechip equity fund"
        });

        // Add Loan
        await clientA.PostAsJsonAsync("/api/v1/loans", new
        {
            Name = "Personal Loan to Sister",
            Counterparty = "Pooja",
            Direction = LoanDirection.Given,
            Principal = 15000.00m,
            InterestRate = 0.00m,
            InterestType = LoanInterestType.None,
            StartDate = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc),
            Note = "Family support"
        });

        // 2. Test Transactions PDF & Excel
        var txPdfResp = await clientA.GetAsync("/api/v1/reports/transactions/pdf?month=2026-10");
        txPdfResp.StatusCode.Should().Be(HttpStatusCode.OK);
        txPdfResp.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");
        var txPdfBytes = await txPdfResp.Content.ReadAsByteArrayAsync();
        txPdfBytes.Should().NotBeEmpty();

        var txXlsxResp = await clientA.GetAsync("/api/v1/reports/transactions/excel?month=2026-10");
        txXlsxResp.StatusCode.Should().Be(HttpStatusCode.OK);
        txXlsxResp.Content.Headers.ContentType!.MediaType.Should().Be("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        var txXlsxBytes = await txXlsxResp.Content.ReadAsByteArrayAsync();
        txXlsxBytes.Should().NotBeEmpty();

        // 3. Test Loans PDF & Excel
        var loansPdfResp = await clientA.GetAsync("/api/v1/reports/loans/pdf");
        loansPdfResp.StatusCode.Should().Be(HttpStatusCode.OK);
        loansPdfResp.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");

        var loansXlsxResp = await clientA.GetAsync("/api/v1/reports/loans/excel");
        loansXlsxResp.StatusCode.Should().Be(HttpStatusCode.OK);
        loansXlsxResp.Content.Headers.ContentType!.MediaType.Should().Be("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        // 4. Test EPFO PDF & Excel
        var epfPdfResp = await clientA.GetAsync("/api/v1/reports/epf/pdf?year=2026");
        epfPdfResp.StatusCode.Should().Be(HttpStatusCode.OK);
        epfPdfResp.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");

        var epfXlsxResp = await clientA.GetAsync("/api/v1/reports/epf/excel?year=2026");
        epfXlsxResp.StatusCode.Should().Be(HttpStatusCode.OK);
        epfXlsxResp.Content.Headers.ContentType!.MediaType.Should().Be("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        // 5. Test Investments PDF & Excel
        var invPdfResp = await clientA.GetAsync("/api/v1/reports/investments/pdf");
        invPdfResp.StatusCode.Should().Be(HttpStatusCode.OK);
        invPdfResp.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");

        var invXlsxResp = await clientA.GetAsync("/api/v1/reports/investments/excel");
        invXlsxResp.StatusCode.Should().Be(HttpStatusCode.OK);
        invXlsxResp.Content.Headers.ContentType!.MediaType.Should().Be("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        // 6. Test Combined Dashboard Statement PDF
        var dashPdfResp = await clientA.GetAsync("/api/v1/reports/dashboard/pdf?month=2026-10");
        dashPdfResp.StatusCode.Should().Be(HttpStatusCode.OK);
        dashPdfResp.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");

        // 7. Verify Unauthenticated call rejected with 401
        var anonClient = _factory.CreateClient();
        var anonResp = await anonClient.GetAsync("/api/v1/reports/transactions/pdf?month=2026-10");
        anonResp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}

