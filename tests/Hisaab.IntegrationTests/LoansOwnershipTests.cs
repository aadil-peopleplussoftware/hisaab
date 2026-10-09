using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Hisaab.Application.Features.Auth.DTOs;
using Hisaab.Application.Features.Loans.DTOs;
using Hisaab.Domain.Enums;
using Xunit;

namespace Hisaab.IntegrationTests;

public class LoansOwnershipTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public LoansOwnershipTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Loans_CompleteLifecycleAndStrictTenantIsolation_UserBCannotAccessOrMutateUserALoans()
    {
        var clientA = _factory.CreateClient();
        var clientB = _factory.CreateClient();

        // 1. Register User A
        var userAEmail = $"loan_alpha_{Guid.NewGuid()}@hisaab.com";
        var regAResp = await clientA.PostAsJsonAsync("/api/v1/auth/register", new
        {
            Email = userAEmail,
            Password = "P@ssword123!",
            FullName = "User Alpha Loans"
        });
        regAResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var authA = await regAResp.Content.ReadFromJsonAsync<AuthResponseDto>();
        clientA.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authA!.AccessToken);

        // 2. User A creates a Given Loan Account
        var createLoanPayload = new
        {
            Name = "Personal Loan to Ramesh",
            Counterparty = "Ramesh Kumar",
            Direction = LoanDirection.Given,
            Principal = 50000.00m,
            InterestRate = 10.00m,
            InterestType = LoanInterestType.Simple,
            StartDate = DateTime.UtcNow.AddMonths(-3),
            DueDate = DateTime.UtcNow.AddMonths(9),
            Note = "Lent for emergency medical expenses"
        };
        var createResp = await clientA.PostAsJsonAsync("/api/v1/loans", createLoanPayload);
        createResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdDetail = await createResp.Content.ReadFromJsonAsync<LoanAccountDetailDto>();
        createdDetail.Should().NotBeNull();
        createdDetail!.Account.Name.Should().Be("Personal Loan to Ramesh");
        createdDetail.Account.Principal.Should().Be(50000.00m);
        createdDetail.Account.OutstandingBalance.Should().Be(50000.00m);
        createdDetail.Transactions.Should().HaveCount(1); // Auto-created disburse
        var loanId = createdDetail.Account.Id;

        // 3. User A records a repayment of 15,000
        var repayPayload = new
        {
            Kind = LoanTransactionKind.Repayment,
            Amount = 15000.00m,
            TransactionDate = DateTime.UtcNow,
            Note = "First EMI repayment received via UPI"
        };
        var repayResp = await clientA.PostAsJsonAsync($"/api/v1/loans/{loanId}/transactions", repayPayload);
        repayResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var updatedDetail = await repayResp.Content.ReadFromJsonAsync<LoanAccountDetailDto>();
        updatedDetail.Should().NotBeNull();
        updatedDetail!.Account.TotalRepaid.Should().Be(15000.00m);
        updatedDetail.Account.OutstandingBalance.Should().Be(35000.00m);
        updatedDetail.Transactions.Should().HaveCount(2);

        // 4. Register User B
        var userBEmail = $"loan_beta_{Guid.NewGuid()}@hisaab.com";
        var regBResp = await clientB.PostAsJsonAsync("/api/v1/auth/register", new
        {
            Email = userBEmail,
            Password = "P@ssword123!",
            FullName = "User Beta Loans"
        });
        regBResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var authB = await regBResp.Content.ReadFromJsonAsync<AuthResponseDto>();
        clientB.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authB!.AccessToken);

        // 5. User B fetches loans -> Must be empty
        var listBResp = await clientB.GetAsync("/api/v1/loans");
        listBResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var listB = await listBResp.Content.ReadFromJsonAsync<LoanListResponseDto>();
        listB.Should().NotBeNull();
        listB!.Accounts.Should().BeEmpty();
        listB.Summary.TotalGivenOutstanding.Should().Be(0m);

        // 6. User B attempts unauthorized access to User A's loan -> MUST return 404 Not Found
        var getBResp = await clientB.GetAsync($"/api/v1/loans/{loanId}");
        getBResp.StatusCode.Should().Be(HttpStatusCode.NotFound);

        // 7. User B attempts to update User A's loan -> MUST return 404 Not Found
        var updateBResp = await clientB.PutAsJsonAsync($"/api/v1/loans/{loanId}", new
        {
            Name = "Hacked Loan",
            Counterparty = "Hacker",
            InterestRate = 0m,
            InterestType = LoanInterestType.None,
            Note = "Unauthorized"
        });
        updateBResp.StatusCode.Should().Be(HttpStatusCode.NotFound);

        // 8. User B attempts to post transaction to User A's loan -> MUST return 404 Not Found
        var postTxnBResp = await clientB.PostAsJsonAsync($"/api/v1/loans/{loanId}/transactions", new
        {
            Kind = LoanTransactionKind.Repayment,
            Amount = 1000m,
            TransactionDate = DateTime.UtcNow
        });
        postTxnBResp.StatusCode.Should().Be(HttpStatusCode.NotFound);

        // 9. User B attempts to delete User A's loan -> MUST return 404 Not Found
        var deleteBResp = await clientB.DeleteAsync($"/api/v1/loans/{loanId}");
        deleteBResp.StatusCode.Should().Be(HttpStatusCode.NotFound);

        // Diagnostic: Can User A still get the loan?
        var getAAfterB = await clientA.GetAsync($"/api/v1/loans/{loanId}");
        var getABody = await getAAfterB.Content.ReadAsStringAsync();
        getAAfterB.StatusCode.Should().Be(HttpStatusCode.OK, because: $"User A GET failed: {getABody}");

        // 10. User A closes the loan account
        var closeResp = await clientA.PatchAsJsonAsync($"/api/v1/loans/{loanId}/status", new
        {
            Status = LoanStatus.Closed
        });
        var closeBody = await closeResp.Content.ReadAsStringAsync();
        closeResp.StatusCode.Should().Be(HttpStatusCode.OK, because: closeBody);
        var closedAccount = await closeResp.Content.ReadFromJsonAsync<LoanAccountDetailDto>();
        closedAccount!.Account.Status.Should().Be(LoanStatus.Closed);

        // 11. User A tries to add transaction to closed loan -> Should fail (DomainException -> 400 Bad Request)
        var invalidTxnResp = await clientA.PostAsJsonAsync($"/api/v1/loans/{loanId}/transactions", new
        {
            Kind = LoanTransactionKind.Repayment,
            Amount = 500m,
            TransactionDate = DateTime.UtcNow
        });
        invalidTxnResp.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        // 12. User A deletes the loan account -> 204 NoContent
        var deleteAResp = await clientA.DeleteAsync($"/api/v1/loans/{loanId}");
        deleteAResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify it is now gone for User A as well
        var verifyDeletedResp = await clientA.GetAsync($"/api/v1/loans/{loanId}");
        verifyDeletedResp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}

