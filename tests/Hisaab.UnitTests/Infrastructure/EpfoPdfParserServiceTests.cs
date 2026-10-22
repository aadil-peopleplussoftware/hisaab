using System.IO;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Hisaab.Infrastructure.Services;
using Xunit;

namespace Hisaab.UnitTests.Infrastructure;

public class EpfoPdfParserServiceTests
{
    private const string SamplePdfPath = @"C:\Users\Aadil\.gemini\antigravity\brain\830d8d7a-6205-4d73-8c70-b716a47df86e\.user_uploaded\media_1792653791260_75345241.pdf";

    [Fact]
    public async Task ParsePassbookPdfAsync_WithValidEpfoPassbook_ExtractsAllFieldsAccurately()
    {
        // Arrange
        var service = new EpfoPdfParserService();
        using var stream = File.OpenRead(SamplePdfPath);

        // Act
        var result = await service.ParsePassbookPdfAsync(stream);

        // Assert Header
        result.EstablishmentId.Should().Be("KDMAL0094997000");
        result.EstablishmentName.Should().Be("MEGASYS INDIA PVT LTD");
        result.MemberId.Should().Be("KDMAL00949970000010195");
        result.MemberName.Should().Be("KHAN MOHAMMAD AADIL ABDULLA KHAN");
        result.DateOfBirth.Should().Be("08-03-1999");
        result.Uan.Should().Be("101905451088");
        result.FinancialYear.Should().Be("2023-2024");

        // Assert Opening Balance
        result.OpeningEmployeeBalance.Should().Be(0m);
        result.OpeningEmployerBalance.Should().Be(0m);
        result.OpeningPensionBalance.Should().Be(0m);

        // Assert Raw Transactions
        result.RawTransactions.Should().HaveCount(9);
        result.RawTransactions.Sum(t => t.EmployeeShare).Should().Be(12600m);
        result.RawTransactions.Sum(t => t.EmployerShare).Should().Be(12600m);
        result.RawTransactions.Sum(t => t.PensionShare).Should().Be(0m);

        // Assert Totals
        result.TotalContributionsEmployee.Should().Be(12600m);
        result.TotalContributionsEmployer.Should().Be(12600m);
        result.TotalContributionsPension.Should().Be(0m);
        result.TotalTransferInsEmployee.Should().Be(0m);
        result.TotalTransferInsEmployer.Should().Be(0m);
        result.TotalTransferInsPension.Should().Be(0m);
        result.TotalWithdrawalsEmployee.Should().Be(0m);
        result.TotalWithdrawalsEmployer.Should().Be(0m);
        result.TotalWithdrawalsPension.Should().Be(0m);
        result.AnnualInterestEmployee.Should().Be(260m);
        result.AnnualInterestEmployer.Should().Be(260m);
        result.ClosingEmployeeBalance.Should().Be(12860m);
        result.ClosingEmployerBalance.Should().Be(12860m);

        // Assert Monthly Consolidated Entries
        // 7 contribution wage months (Aug 2023 through Feb 2024) + 1 interest settlement entry for March 2024
        result.MonthlyEntries.Should().HaveCount(8);

        // November 2023 should have consolidated the two split transactions (864 + 936 = 1800)
        var novEntry = result.MonthlyEntries.First(e => e.MonthLabel == "Nov 2023");
        novEntry.EmployeeShare.Should().Be(1800m);
        novEntry.EmployerShare.Should().Be(1800m);

        // December 2023 should have consolidated the two split transactions (936 + 864 = 1800)
        var decEntry = result.MonthlyEntries.First(e => e.MonthLabel == "Dec 2023");
        decEntry.EmployeeShare.Should().Be(1800m);
        decEntry.EmployerShare.Should().Be(1800m);

        // March 2024 should have the total annual interest credit (260 + 260 = 520)
        var marchEntry = result.MonthlyEntries.First(e => e.MonthLabel == "Mar 2024");
        marchEntry.Interest.Should().Be(520m);
        marchEntry.NetInflow.Should().Be(520m);
    }
}
