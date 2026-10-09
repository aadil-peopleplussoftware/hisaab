using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Hisaab.Application.Features.Auth.DTOs;
using Hisaab.Application.Features.Investments.DTOs;
using Hisaab.Domain.Enums;
using Xunit;

namespace Hisaab.IntegrationTests;

public class InvestmentsOwnershipTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public InvestmentsOwnershipTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Investments_LifecycleAndStrictTenantIsolation_UserBCannotViewOrMutateUserAHoldings()
    {
        var clientA = _factory.CreateClient();
        var clientB = _factory.CreateClient();

        // 1. Register User A
        var userAEmail = $"inv_alpha_{Guid.NewGuid()}@hisaab.com";
        var regAResp = await clientA.PostAsJsonAsync("/api/v1/auth/register", new
        {
            Email = userAEmail,
            Password = "P@ssword123!",
            FullName = "User Alpha Investments"
        });
        regAResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var authA = await regAResp.Content.ReadFromJsonAsync<AuthResponseDto>();
        clientA.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authA!.AccessToken);

        // 2. User A creates a Mutual Fund holding
        var createPayload = new
        {
            Name = "HDFC Nifty 50 Index Fund",
            Type = InvestmentType.MutualFund,
            InitialInvestedAmount = 50000.00m,
            InitialUnits = 250.0m,
            CurrentValue = 55000.00m,
            Note = "Monthly SIP index investment"
        };
        var createResp = await clientA.PostAsJsonAsync("/api/v1/investments", createPayload);
        createResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdHolding = await createResp.Content.ReadFromJsonAsync<HoldingDetailDto>();
        createdHolding.Should().NotBeNull();
        createdHolding!.Holding.Name.Should().Be("HDFC Nifty 50 Index Fund");
        createdHolding.Holding.TotalInvested.Should().Be(50000.00m);
        createdHolding.Holding.CurrentValue.Should().Be(55000.00m);
        createdHolding.Holding.AbsoluteGainLoss.Should().Be(5000.00m);
        createdHolding.Holding.GainLossPercentage.Should().Be(10.00m);
        createdHolding.Transactions.Should().HaveCount(1); // Auto-generated buy txn
        var holdingId = createdHolding.Holding.Id;

        // 3. User A adds a dividend transaction (+1000)
        var divPayload = new
        {
            Kind = InvestmentTransactionKind.Dividend,
            Amount = 1000.00m,
            TransactionDate = DateTime.UtcNow,
            Note = "Annual dividend payout"
        };
        var divResp = await clientA.PostAsJsonAsync($"/api/v1/investments/{holdingId}/transactions", divPayload);
        divResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var updatedWithDiv = await divResp.Content.ReadFromJsonAsync<HoldingDetailDto>();
        updatedWithDiv!.Holding.TotalDividend.Should().Be(1000.00m);
        updatedWithDiv.Transactions.Should().HaveCount(2);

        // 4. Register User B
        var userBEmail = $"inv_beta_{Guid.NewGuid()}@hisaab.com";
        var regBResp = await clientB.PostAsJsonAsync("/api/v1/auth/register", new
        {
            Email = userBEmail,
            Password = "P@ssword123!",
            FullName = "User Beta Investments"
        });
        regBResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var authB = await regBResp.Content.ReadFromJsonAsync<AuthResponseDto>();
        clientB.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authB!.AccessToken);

        // 5. User B fetches investments -> User A's holdings MUST NOT appear
        var listBResp = await clientB.GetAsync("/api/v1/investments");
        listBResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var listB = await listBResp.Content.ReadFromJsonAsync<InvestmentsResponseDto>();
        listB.Should().NotBeNull();
        listB!.Holdings.Should().BeEmpty();
        listB.Summary.TotalCurrentValue.Should().Be(0m);
        listB.Summary.TotalInvested.Should().Be(0m);

        // 6. User B attempts to view User A's holding -> MUST return 404 Not Found
        var getBResp = await clientB.GetAsync($"/api/v1/investments/{holdingId}");
        getBResp.StatusCode.Should().Be(HttpStatusCode.NotFound);

        // 7. User B attempts to update User A's holding -> MUST return 404 Not Found
        var updateBResp = await clientB.PutAsJsonAsync($"/api/v1/investments/{holdingId}", new
        {
            Name = "Hacked Fund",
            Type = InvestmentType.Stock,
            CurrentValue = 0m
        });
        updateBResp.StatusCode.Should().Be(HttpStatusCode.NotFound);

        // 8. User B attempts to post transaction to User A's holding -> MUST return 404 Not Found
        var postTxnBResp = await clientB.PostAsJsonAsync($"/api/v1/investments/{holdingId}/transactions", new
        {
            Kind = InvestmentTransactionKind.Sell,
            Amount = 10000m,
            TransactionDate = DateTime.UtcNow
        });
        postTxnBResp.StatusCode.Should().Be(HttpStatusCode.NotFound);

        // 9. User B attempts to delete User A's holding -> MUST return 404 Not Found
        var deleteBResp = await clientB.DeleteAsync($"/api/v1/investments/{holdingId}");
        deleteBResp.StatusCode.Should().Be(HttpStatusCode.NotFound);

        // 10. User A updates valuation to 58,000
        var updateAResp = await clientA.PutAsJsonAsync($"/api/v1/investments/{holdingId}", new
        {
            Name = "HDFC Nifty 50 Index Fund",
            Type = InvestmentType.MutualFund,
            CurrentValue = 58000.00m,
            Note = "Updated NAV valuation"
        });
        updateAResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedVal = await updateAResp.Content.ReadFromJsonAsync<HoldingDetailDto>();
        updatedVal!.Holding.CurrentValue.Should().Be(58000.00m);
        updatedVal.Holding.AbsoluteGainLoss.Should().Be(8000.00m);
        updatedVal.Holding.GainLossPercentage.Should().Be(16.00m);

        // 11. User A deletes the holding -> 204 NoContent
        var deleteAResp = await clientA.DeleteAsync($"/api/v1/investments/{holdingId}");
        deleteAResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // 12. Verification: User A can no longer view deleted holding
        var verifyDeletedResp = await clientA.GetAsync($"/api/v1/investments/{holdingId}");
        verifyDeletedResp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}

