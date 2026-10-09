using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.Auth.DTOs;
using Hisaab.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Hisaab.IntegrationTests;

public class SettingsAndAdminEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public SettingsAndAdminEndpointsTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task SettingsAndAdmin_Lifecycle_Preferences_Export_Deletion_And_AdminSecurity()
    {
        var clientUser = _factory.CreateClient();

        // 1. Register normal user
        var userEmail = $"user_settings_{Guid.NewGuid()}@hisaab.com";
        var regResp = await clientUser.PostAsJsonAsync("/api/v1/auth/register", new
        {
            Email = userEmail,
            Password = "P@ssword123!",
            FullName = "Standard Finance User"
        });
        regResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var authUser = await regResp.Content.ReadFromJsonAsync<AuthResponseDto>();
        clientUser.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authUser!.AccessToken);

        // 2. Test Get & Update Preferences
        var getPrefResp = await clientUser.GetAsync("/api/v1/settings/preferences");
        getPrefResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var updatePrefResp = await clientUser.PutAsJsonAsync("/api/v1/settings/preferences", new
        {
            FullName = "Standard Finance User Updated",
            Timezone = "Asia/Kolkata",
            Locale = "en-IN"
        });
        updatePrefResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedProfile = await updatePrefResp.Content.ReadFromJsonAsync<UserProfileDto>();
        updatedProfile!.FullName.Should().Be("Standard Finance User Updated");

        // 3. Test Full Data Export (JSON & Excel)
        var exportJsonResp = await clientUser.GetAsync("/api/v1/settings/export/json");
        exportJsonResp.StatusCode.Should().Be(HttpStatusCode.OK);
        exportJsonResp.Content.Headers.ContentType!.MediaType.Should().Be("application/json");
        var jsonBytes = await exportJsonResp.Content.ReadAsByteArrayAsync();
        jsonBytes.Should().NotBeEmpty();
        using (var jsonDoc = JsonDocument.Parse(jsonBytes))
        {
            jsonDoc.RootElement.TryGetProperty("exportMetadata", out _).Should().BeTrue();
        }

        var exportExcelResp = await clientUser.GetAsync("/api/v1/settings/export/excel");
        exportExcelResp.StatusCode.Should().Be(HttpStatusCode.OK);
        exportExcelResp.Content.Headers.ContentType!.MediaType.Should().Be("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        var excelBytes = await exportExcelResp.Content.ReadAsByteArrayAsync();
        excelBytes.Should().NotBeEmpty();

        // 4. Test Admin Authorization Guard for standard user (Role = "User")
        var forbiddenUsersResp = await clientUser.GetAsync("/api/v1/admin/users");
        forbiddenUsersResp.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var forbiddenAuditResp = await clientUser.GetAsync("/api/v1/admin/audit-logs");
        forbiddenAuditResp.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var forbiddenHealthResp = await clientUser.GetAsync("/api/v1/admin/system-health");
        forbiddenHealthResp.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        // 5. Create an Admin user directly in DB and test Admin endpoints
        using (var scope = _factory.Services.CreateScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<ApplicationRole>>();

            if (!await roleManager.RoleExistsAsync("Admin"))
            {
                await roleManager.CreateAsync(new ApplicationRole("Admin"));
            }

            var adminEmail = $"admin_{Guid.NewGuid()}@hisaab.com";
            var adminUser = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                FullName = "System Administrator",
                IsActive = true,
                EmailConfirmed = true
            };
            await userManager.CreateAsync(adminUser, "P@ssword123!");
            await userManager.AddToRoleAsync(adminUser, "Admin");

            // Generate token for Admin
            var tokenGen = scope.ServiceProvider.GetRequiredService<IJwtTokenGenerator>();
            var adminToken = tokenGen.GenerateAccessToken(adminUser.Id, adminUser.Email, adminUser.FullName, "Admin");

            var clientAdmin = _factory.CreateClient();
            clientAdmin.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

            var adminUsersResp = await clientAdmin.GetAsync("/api/v1/admin/users");
            adminUsersResp.StatusCode.Should().Be(HttpStatusCode.OK);

            var adminAuditResp = await clientAdmin.GetAsync("/api/v1/admin/audit-logs");
            adminAuditResp.StatusCode.Should().Be(HttpStatusCode.OK);

            var adminHealthResp = await clientAdmin.GetAsync("/api/v1/admin/system-health");
            adminHealthResp.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        // 6. Test Account Deletion for standard user
        var deleteResp = await clientUser.PostAsync("/api/v1/settings/account/delete", null);
        deleteResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Attempt login with deleted account -> Should fail
        var loginDeletedResp = await clientUser.PostAsJsonAsync("/api/v1/auth/login", new
        {
            Email = userEmail,
            Password = "P@ssword123!"
        });
        loginDeletedResp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
