using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Hisaab.Application.Features.Auth.DTOs;
using Hisaab.Application.Features.Epfo.DTOs;
using Xunit;

namespace Hisaab.IntegrationTests;

public class EpfoOwnershipTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public EpfoOwnershipTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Epfo_LifecycleAndMultiTenantSecurity_UserBCannotViewOrMutateUserAEntries()
    {
        var clientA = _factory.CreateClient();
        var clientB = _factory.CreateClient();

        // 1. Register User A
        var userAEmail = $"epf_alpha_{Guid.NewGuid()}@hisaab.com";
        var regAResp = await clientA.PostAsJsonAsync("/api/v1/auth/register", new
        {
            Email = userAEmail,
            Password = "P@ssword123!",
            FullName = "User Alpha EPFO"
        });
        regAResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var authA = await regAResp.Content.ReadFromJsonAsync<AuthResponseDto>();
        clientA.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authA!.AccessToken);

        // 2. User A records EPF entries for Jan and Feb 2026
        var janEntryPayload = new
        {
            Month = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            EmployeeShare = 1800.00m,
            EmployerShare = 550.00m,
            PensionShare = 1250.00m,
            Interest = 0m,
            Withdrawal = 0m,
            Note = "January 2026 Regular Salary"
        };
        var createJanResp = await clientA.PostAsJsonAsync("/api/v1/epf", janEntryPayload);
        createJanResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var janResponse = await createJanResp.Content.ReadFromJsonAsync<EpfResponseDto>();
        janResponse.Should().NotBeNull();
        janResponse!.Entries.Should().HaveCount(1);
        janResponse.Summary.ClosingBalance.Should().Be(2350.00m); // 1800 + 550
        janResponse.AllTimePensionBalance.Should().Be(1250.00m);
        var janEntryId = janResponse.Entries.First().Id;

        var febEntryPayload = new
        {
            Month = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc),
            EmployeeShare = 1800.00m,
            EmployerShare = 550.00m,
            PensionShare = 1250.00m,
            Interest = 0m,
            Withdrawal = 0m,
            Note = "February 2026 Regular Salary"
        };
        var createFebResp = await clientA.PostAsJsonAsync("/api/v1/epf", febEntryPayload);
        createFebResp.StatusCode.Should().Be(HttpStatusCode.Created);
        var febResponse = await createFebResp.Content.ReadFromJsonAsync<EpfResponseDto>();
        febResponse!.Entries.Should().HaveCount(2);
        febResponse.Summary.ClosingBalance.Should().Be(4700.00m); // 2350 + 2350
        febResponse.AllTimePensionBalance.Should().Be(2500.00m);

        // 3. User A attempts to create a duplicate entry for January 2026 -> Should return 400 Bad Request
        var duplicateResp = await clientA.PostAsJsonAsync("/api/v1/epf", janEntryPayload);
        duplicateResp.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        // 4. Register User B
        var userBEmail = $"epf_beta_{Guid.NewGuid()}@hisaab.com";
        var regBResp = await clientB.PostAsJsonAsync("/api/v1/auth/register", new
        {
            Email = userBEmail,
            Password = "P@ssword123!",
            FullName = "User Beta EPFO"
        });
        regBResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var authB = await regBResp.Content.ReadFromJsonAsync<AuthResponseDto>();
        clientB.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authB!.AccessToken);

        // 5. User B fetches EPF -> User A's entries MUST NOT appear
        var listBResp = await clientB.GetAsync("/api/v1/epf?year=2026");
        listBResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var listB = await listBResp.Content.ReadFromJsonAsync<EpfResponseDto>();
        listB.Should().NotBeNull();
        listB!.Entries.Should().BeEmpty();
        listB.Summary.ClosingBalance.Should().Be(0m);
        listB.AllTimeEpfBalance.Should().Be(0m);

        // 6. User B attempts to update User A's EPF entry -> MUST return 404 Not Found
        var updateBResp = await clientB.PutAsJsonAsync($"/api/v1/epf/{janEntryId}", new
        {
            Month = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            EmployeeShare = 9999m,
            EmployerShare = 9999m,
            PensionShare = 9999m
        });
        updateBResp.StatusCode.Should().Be(HttpStatusCode.NotFound);

        // 7. User B attempts to delete User A's EPF entry -> MUST return 404 Not Found
        var deleteBResp = await clientB.DeleteAsync($"/api/v1/epf/{janEntryId}");
        deleteBResp.StatusCode.Should().Be(HttpStatusCode.NotFound);

        // 8. User A updates their January entry with interest and note
        var updateAResp = await clientA.PutAsJsonAsync($"/api/v1/epf/{janEntryId}", new
        {
            Month = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            EmployeeShare = 1800.00m,
            EmployerShare = 550.00m,
            PensionShare = 1250.00m,
            Interest = 350.00m,
            Withdrawal = 0m,
            Note = "January 2026 + Interest credit"
        });
        updateAResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedA = await updateAResp.Content.ReadFromJsonAsync<EpfResponseDto>();
        // New closing balance = 4700 + 350 = 5050
        updatedA!.Summary.ClosingBalance.Should().Be(5050.00m);

        // 9. User A deletes their January entry -> 204 NoContent
        var deleteAResp = await clientA.DeleteAsync($"/api/v1/epf/{janEntryId}");
        deleteAResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // 10. User A verifies January is gone, only February remains
        var finalAResp = await clientA.GetAsync("/api/v1/epf?year=2026");
        finalAResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var finalA = await finalAResp.Content.ReadFromJsonAsync<EpfResponseDto>();
        finalA!.Entries.Should().HaveCount(1);
        finalA.Entries.Should().NotContain(e => e.Id == janEntryId);
        finalA.Summary.ClosingBalance.Should().Be(2350.00m);
    }
}

