using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Hisaab.Application.Features.Auth.DTOs;
using Hisaab.Application.Features.Categories.DTOs;
using Hisaab.Application.Features.Transactions.DTOs;
using Hisaab.Domain.Enums;
using Xunit;

namespace Hisaab.IntegrationTests;

public class TransactionsOwnershipTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public TransactionsOwnershipTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Transactions_StrictUserIsolation_UserBCannotViewOrDeleteUserAData()
    {
        var clientA = _factory.CreateClient();
        var clientB = _factory.CreateClient();

        // 1. Register User A
        var userAEmail = $"user_a_{Guid.NewGuid()}@hisaab.com";
        var regAResp = await clientA.PostAsJsonAsync("/api/v1/auth/register", new
        {
            Email = userAEmail,
            Password = "P@ssword123!",
            FullName = "User Alpha"
        });
        regAResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var authA = await regAResp.Content.ReadFromJsonAsync<AuthResponseDto>();
        clientA.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authA!.AccessToken);

        // 2. Fetch categories for User A
        var catResp = await clientA.GetAsync("/api/v1/categories");
        catResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var categories = await catResp.Content.ReadFromJsonAsync<List<CategoryDto>>();
        categories.Should().NotBeNullOrEmpty();
        var selectedCategory = categories!.First();

        // 3. User A creates a transaction
        var txnPayload = new
        {
            Type = TransactionType.Expense,
            Amount = 4500.00m,
            CategoryId = selectedCategory.Id,
            TransactionDate = DateTime.UtcNow,
            Note = "Alpha private groceries"
        };
        var createResp = await clientA.PostAsJsonAsync("/api/v1/transactions", txnPayload);
        createResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdTxn = await createResp.Content.ReadFromJsonAsync<TransactionDto>();
        createdTxn.Should().NotBeNull();
        createdTxn!.Amount.Should().Be(4500.00m);

        // 4. Register User B
        var userBEmail = $"user_b_{Guid.NewGuid()}@hisaab.com";
        var regBResp = await clientB.PostAsJsonAsync("/api/v1/auth/register", new
        {
            Email = userBEmail,
            Password = "P@ssword123!",
            FullName = "User Beta"
        });
        regBResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var authB = await regBResp.Content.ReadFromJsonAsync<AuthResponseDto>();
        clientB.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authB!.AccessToken);

        // 5. User B fetches transactions -> User A's transaction MUST NOT appear
        var listBResp = await clientB.GetAsync("/api/v1/transactions");
        var listBContent = await listBResp.Content.ReadAsStringAsync();
        listBResp.StatusCode.Should().Be(HttpStatusCode.OK, because: listBContent);
        var listB = await listBResp.Content.ReadFromJsonAsync<TransactionsResponseDto>();
        listB.Should().NotBeNull();
        listB!.Transactions.Items.Should().NotContain(t => t.Id == createdTxn.Id);

        // 6. User B attempts to delete User A's transaction -> MUST return 404 (Not Found)
        var deleteBResp = await clientB.DeleteAsync($"/api/v1/transactions/{createdTxn.Id}");
        deleteBResp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
