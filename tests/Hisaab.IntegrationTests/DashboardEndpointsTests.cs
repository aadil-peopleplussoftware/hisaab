using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Hisaab.Application.Features.Auth.DTOs;
using Hisaab.Application.Features.Categories.DTOs;
using Hisaab.Application.Features.Dashboard.DTOs;
using Hisaab.Domain.Enums;
using Xunit;

namespace Hisaab.IntegrationTests;

public class DashboardEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public DashboardEndpointsTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Dashboard_ShouldAggregateUserData_AndStrictlyIsolateAcrossTenants()
    {
        var clientA = _factory.CreateClient();
        var clientB = _factory.CreateClient();

        // 1. Register User A
        var userAEmail = $"dash_alpha_{Guid.NewGuid()}@hisaab.com";
        var regAResp = await clientA.PostAsJsonAsync("/api/v1/auth/register", new
        {
            Email = userAEmail,
            Password = "P@ssword123!",
            FullName = "User Alpha Dashboard"
        });
        regAResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var authA = await regAResp.Content.ReadFromJsonAsync<AuthResponseDto>();
        clientA.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authA!.AccessToken);

        // Fetch categories for User A
        var catResp = await clientA.GetAsync("/api/v1/categories");
        catResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var categories = await catResp.Content.ReadFromJsonAsync<List<CategoryDto>>();
        categories.Should().NotBeNull();
        var incomeCat = categories!.First(c => c.Type == TransactionType.Income);
        var expenseCat = categories!.First(c => c.Type == TransactionType.Expense);

        // 2. Create financial entries for User A in 2026-10
        // Income transaction
        var incResp = await clientA.PostAsJsonAsync("/api/v1/transactions", new
        {
            Type = TransactionType.Income,
            Amount = 100000.00m,
            CategoryId = incomeCat.Id,
            TransactionDate = new DateTime(2026, 10, 5, 10, 0, 0, DateTimeKind.Utc),
            Note = "October consulting"
        });
        incResp.StatusCode.Should().Be(HttpStatusCode.Created);

        // Expense transaction
        var expResp = await clientA.PostAsJsonAsync("/api/v1/transactions", new
        {
            Type = TransactionType.Expense,
            Amount = 40000.00m,
            CategoryId = expenseCat.Id,
            TransactionDate = new DateTime(2026, 10, 10, 14, 0, 0, DateTimeKind.Utc),
            Note = "October rent and bills"
        });
        expResp.StatusCode.Should().Be(HttpStatusCode.Created);

        // EPF entry
        var epfResp = await clientA.PostAsJsonAsync("/api/v1/epf", new
        {
            Month = "2026-10-01",
            EmployeeShare = 1800.00m,
            EmployerShare = 550.00m,
            PensionShare = 1250.00m,
            Interest = 0.00m,
            Withdrawal = 0.00m,
            Note = "Oct EPF contribution"
        });
        epfResp.StatusCode.Should().Be(HttpStatusCode.Created);

        // Investment holding
        var invResp = await clientA.PostAsJsonAsync("/api/v1/investments", new
        {
            Name = "Parag Parikh Flexi Cap",
            Type = InvestmentType.MutualFund,
            InitialInvestedAmount = 50000.00m,
            InitialUnits = 100.0m,
            CurrentValue = 60000.00m,
            Note = "Core equity holding"
        });
        invResp.StatusCode.Should().Be(HttpStatusCode.Created);

        // Loan account (Given to colleague)
        var loanResp = await clientA.PostAsJsonAsync("/api/v1/loans", new
        {
            Name = "Emergency Loan to Rohan",
            Counterparty = "Rohan Sharma",
            Direction = LoanDirection.Given,
            Principal = 20000.00m,
            InterestRate = 0.00m,
            InterestType = LoanInterestType.None,
            StartDate = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc),
            DueDate = new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc),
            Note = "Short-term advance"
        });
        loanResp.StatusCode.Should().Be(HttpStatusCode.Created);

        // 3. User A queries Dashboard for 2026-10
        var dashAResp = await clientA.GetAsync("/api/v1/dashboard?month=2026-10");
        dashAResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var dashA = await dashAResp.Content.ReadFromJsonAsync<DashboardResponseDto>();
        dashA.Should().NotBeNull();

        // Validate monthly overview
        dashA!.MonthlyOverview.Month.Should().Be("2026-10");
        dashA.MonthlyOverview.TotalIncome.Should().Be(100000.00m);
        dashA.MonthlyOverview.TotalExpense.Should().Be(40000.00m);
        dashA.MonthlyOverview.NetSavings.Should().Be(60000.00m);
        dashA.MonthlyOverview.SavingsRatePercentage.Should().Be(60.00m);
        dashA.MonthlyOverview.TransactionCount.Should().Be(2);

        // Validate Net Worth components
        // Liquid cash = 100,000 - 40,000 = 60,000
        // Investments = 60,000
        // EPF balance = 1800 + 550 = 2,350
        // Loans receivable = 20,000
        // Total Net Worth = 60,000 + 60,000 + 2,350 + 20,000 = 142,350.00
        dashA.NetWorth.LiquidCash.Should().Be(60000.00m);
        dashA.NetWorth.InvestmentsValue.Should().Be(60000.00m);
        dashA.NetWorth.EpfBalance.Should().Be(2350.00m);
        dashA.NetWorth.LoansReceivable.Should().Be(20000.00m);
        dashA.NetWorth.LoansPayable.Should().Be(0.00m);
        dashA.NetWorth.TotalNetWorth.Should().Be(142350.00m);

        // Validate Monthly Trends (6 items trailing)
        dashA.MonthlyTrends.Should().HaveCount(6);
        var octTrend = dashA.MonthlyTrends.FirstOrDefault(t => t.Month == "2026-10");
        octTrend.Should().NotBeNull();
        octTrend!.Income.Should().Be(100000.00m);
        octTrend.Expense.Should().Be(40000.00m);
        octTrend.NetSavings.Should().Be(60000.00m);

        // Validate Category Breakdowns
        dashA.TopExpenseCategories.Should().NotBeEmpty();
        dashA.TopIncomeCategories.Should().NotBeEmpty();

        // Validate Upcoming Loan Dues
        dashA.UpcomingLoanDues.Should().HaveCount(1);
        dashA.UpcomingLoanDues[0].Counterparty.Should().Be("Rohan Sharma");
        dashA.UpcomingLoanDues[0].OutstandingBalance.Should().Be(20000.00m);

        // 4. Register User B and verify complete multi-tenant isolation
        var userBEmail = $"dash_beta_{Guid.NewGuid()}@hisaab.com";
        var regBResp = await clientB.PostAsJsonAsync("/api/v1/auth/register", new
        {
            Email = userBEmail,
            Password = "P@ssword123!",
            FullName = "User Beta Dashboard"
        });
        regBResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var authB = await regBResp.Content.ReadFromJsonAsync<AuthResponseDto>();
        clientB.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authB!.AccessToken);

        // User B requests Dashboard for same month
        var dashBResp = await clientB.GetAsync("/api/v1/dashboard?month=2026-10");
        dashBResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var dashB = await dashBResp.Content.ReadFromJsonAsync<DashboardResponseDto>();
        dashB.Should().NotBeNull();

        // User B must see zero amounts and no records belonging to User A
        dashB!.MonthlyOverview.TotalIncome.Should().Be(0.00m);
        dashB.MonthlyOverview.TotalExpense.Should().Be(0.00m);
        dashB.MonthlyOverview.NetSavings.Should().Be(0.00m);
        dashB.MonthlyOverview.TransactionCount.Should().Be(0);
        dashB.NetWorth.TotalNetWorth.Should().Be(0.00m);
        dashB.NetWorth.LiquidCash.Should().Be(0.00m);
        dashB.NetWorth.InvestmentsValue.Should().Be(0.00m);
        dashB.NetWorth.EpfBalance.Should().Be(0.00m);
        dashB.NetWorth.LoansReceivable.Should().Be(0.00m);
        dashB.TopExpenseCategories.Should().BeEmpty();
        dashB.TopIncomeCategories.Should().BeEmpty();
        dashB.UpcomingLoanDues.Should().BeEmpty();
        dashB.RecentTransactions.Should().BeEmpty();
    }
}

