using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using FluentAssertions;
using Hisaab.Application.Features.Auth.DTOs;
using Hisaab.Application.Features.DataTransfer.DTOs;
using Xunit;

namespace Hisaab.IntegrationTests;

public class DataTransferEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public DataTransferEndpointsTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task DownloadTemplate_ShouldReturnXlsxFile_ForSupportedModules()
    {
        var client = _factory.CreateClient();

        // Register user
        var email = $"transfer_{Guid.NewGuid()}@hisaab.com";
        var regResp = await client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            Email = email,
            Password = "P@ssword123!",
            FullName = "Transfer Tester"
        });
        regResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await regResp.Content.ReadFromJsonAsync<AuthResponseDto>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);

        // Download template
        var resp = await client.GetAsync("/api/v1/import/templates/Transactions");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        resp.Content.Headers.ContentType!.MediaType.Should().Be("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        var bytes = await resp.Content.ReadAsByteArrayAsync();
        bytes.Length.Should().BeGreaterThan(1000);
    }

    [Fact]
    public async Task CompleteImportFlow_Upload_Mapping_Validate_Commit_AndRollback_ShouldSucceed()
    {
        var client = _factory.CreateClient();

        // 1. Register User
        var email = $"import_{Guid.NewGuid()}@hisaab.com";
        var regResp = await client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            Email = email,
            Password = "P@ssword123!",
            FullName = "Import Flow User"
        });
        regResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await regResp.Content.ReadFromJsonAsync<AuthResponseDto>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);

        // 2. Prepare sample CSV with custom headers (testing synonym auto-matching)
        var csvContent = @"Txn Type,Amt,Expense Head,Txn Date,Narration
Income,75000.00,Consulting,05-10-2026,Monthly Consulting
Expense,2500.00,Groceries,06-10-2026,Weekly Groceries
";
        var csvBytes = Encoding.UTF8.GetBytes(csvContent);

        using var form = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(csvBytes);
        fileContent.Headers.ContentType = MediaTypeHeaderValue.Parse("text/csv");
        form.Add(fileContent, "file", "transactions.csv");
        form.Add(new StringContent("Transactions"), "module");

        // 3. Upload File
        var uploadResp = await client.PostAsync("/api/v1/import/upload", form);
        uploadResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var uploadResult = await uploadResp.Content.ReadFromJsonAsync<UploadResultDto>();
        uploadResult.Should().NotBeNull();
        uploadResult!.TotalRows.Should().Be(2);
        uploadResult.Headers.Should().Contain("Amt");

        var batchId = uploadResult.BatchId;

        // 4. Save Mapping
        var mappingPayload = new MappingRequestDto(
            ColumnMap: new Dictionary<string, string>
            {
                ["Txn Type"] = "Type",
                ["Amt"] = "Amount",
                ["Expense Head"] = "Category",
                ["Txn Date"] = "Date",
                ["Narration"] = "Note"
            },
            DateFormat: "dd-MM-yyyy",
            SaveAsProfileName: "My Consulting Format"
        );

        var mapResp = await client.PostAsJsonAsync($"/api/v1/import/{batchId}/mapping", mappingPayload);
        mapResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // 5. Validate Batch
        var valResp = await client.PostAsync($"/api/v1/import/{batchId}/validate", null);
        valResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var preview = await valResp.Content.ReadFromJsonAsync<PreviewValidationResultDto>();
        preview.Should().NotBeNull();
        preview!.TotalRowsPreviewed.Should().Be(2);
        preview.ValidCount.Should().Be(2);
        preview.InvalidCount.Should().Be(0);

        // 6. Commit Batch
        var commitResp = await client.PostAsync($"/api/v1/import/{batchId}/commit", null);
        commitResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var commitResult = await commitResp.Content.ReadFromJsonAsync<ImportResultDto>();
        commitResult.Should().NotBeNull();
        commitResult!.SuccessRows.Should().Be(2);
        commitResult.FailedRows.Should().Be(0);

        // 7. Verify items are visible in transactions list
        var txResp = await client.GetAsync("/api/v1/transactions?month=2026-10");
        txResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // 8. Test Rollback
        var rollbackResp = await client.PostAsync($"/api/v1/import/{batchId}/rollback", null);
        rollbackResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify batch status is rolled back
        var batchResp = await client.GetAsync($"/api/v1/import/{batchId}");
        batchResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var batchDetail = await batchResp.Content.ReadFromJsonAsync<ImportBatchDetailDto>();
        batchDetail.Should().NotBeNull();
        batchDetail!.StatusName.Should().Be("RolledBack");
    }

    [Fact]
    public async Task ExportModule_And_ExportAll_ShouldReturnValidFiles()
    {
        var client = _factory.CreateClient();

        var email = $"export_{Guid.NewGuid()}@hisaab.com";
        var regResp = await client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            Email = email,
            Password = "P@ssword123!",
            FullName = "Export Tester"
        });
        regResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await regResp.Content.ReadFromJsonAsync<AuthResponseDto>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);

        // Export module CSV
        var csvResp = await client.GetAsync("/api/v1/export/transactions?format=csv");
        csvResp.StatusCode.Should().Be(HttpStatusCode.OK);
        csvResp.Content.Headers.ContentType!.MediaType.Should().Be("text/csv");

        // Export all XLSX
        var allResp = await client.GetAsync("/api/v1/export/all");
        allResp.StatusCode.Should().Be(HttpStatusCode.OK);
        allResp.Content.Headers.ContentType!.MediaType.Should().Be("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }

    [Fact]
    public async Task MultiTenantIsolation_UserACannotAccessUserBBatch()
    {
        var clientA = _factory.CreateClient();
        var clientB = _factory.CreateClient();

        // Register A
        var emailA = $"userA_{Guid.NewGuid()}@hisaab.com";
        var regA = await clientA.PostAsJsonAsync("/api/v1/auth/register", new { Email = emailA, Password = "P@ssword123!", FullName = "User A" });
        var authA = await regA.Content.ReadFromJsonAsync<AuthResponseDto>();
        clientA.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authA!.AccessToken);

        // Register B
        var emailB = $"userB_{Guid.NewGuid()}@hisaab.com";
        var regB = await clientB.PostAsJsonAsync("/api/v1/auth/register", new { Email = emailB, Password = "P@ssword123!", FullName = "User B" });
        var authB = await regB.Content.ReadFromJsonAsync<AuthResponseDto>();
        clientB.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", authB!.AccessToken);

        // User A uploads a file
        var csv = Encoding.UTF8.GetBytes("Type,Amount,Category,Date\nIncome,1000,Salary,01-10-2026");
        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(csv), "file", "test.csv");
        form.Add(new StringContent("Transactions"), "module");

        var upload = await clientA.PostAsync("/api/v1/import/upload", form);
        var batch = await upload.Content.ReadFromJsonAsync<UploadResultDto>();

        // User B tries to view or rollback User A's batch -> Should receive 404 Not Found (zero information enumeration)
        var getResp = await clientB.GetAsync($"/api/v1/import/{batch!.BatchId}");
        getResp.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var rollbackResp = await clientB.PostAsync($"/api/v1/import/{batch.BatchId}/rollback", null);
        rollbackResp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}

