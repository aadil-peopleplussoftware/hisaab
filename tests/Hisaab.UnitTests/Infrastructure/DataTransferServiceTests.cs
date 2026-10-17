using System.Globalization;
using System.Text.RegularExpressions;
using ClosedXML.Excel;
using FluentAssertions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Infrastructure.Services;
using NSubstitute;
using Xunit;

namespace Hisaab.UnitTests.Infrastructure;

public class DataTransferServiceTests
{
    private readonly IApplicationDbContext _context;
    private readonly IAuditService _auditService;
    private readonly DataTransferService _service;

    public DataTransferServiceTests()
    {
        _context = Substitute.For<IApplicationDbContext>();
        _auditService = Substitute.For<IAuditService>();
        _service = new DataTransferService(_context, _auditService);
    }

    [Theory]
    [InlineData("Transactions")]
    [InlineData("LoanAccounts")]
    [InlineData("LoanTransactions")]
    [InlineData("Epfo")]
    [InlineData("Holdings")]
    [InlineData("InvestmentTransactions")]
    [InlineData("Categories")]
    public void GetModuleMetadata_ShouldReturnMetadata_ForAllSupportedModules(string module)
    {
        var meta = _service.GetModuleMetadata(module);

        meta.Should().NotBeNull();
        meta.Module.Should().Be(module);
        meta.Fields.Should().NotBeEmpty();
        meta.Fields.Should().Contain(f => f.IsRequired);
    }

    [Fact]
    public void GenerateBlankTemplate_ShouldGenerateExcelWithTwoSheets()
    {
        var bytes = _service.GenerateBlankTemplate("Transactions");

        bytes.Should().NotBeNull();
        bytes.Length.Should().BeGreaterThan(1000);

        using var ms = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(ms);

        workbook.Worksheets.Count.Should().Be(2);
        workbook.Worksheets.Should().Contain(ws => ws.Name == "Template");
        workbook.Worksheets.Should().Contain(ws => ws.Name == "Instructions");

        var templateSheet = workbook.Worksheet("Template");
        templateSheet.Cell(1, 1).Value.ToString().Should().Contain("Type");
        templateSheet.Cell(1, 2).Value.ToString().Should().Contain("Amount");
    }

    [Theory]
    [InlineData("₹1,25,000.00", 125000.00)]
    [InlineData("Rs. 50,000", 50000.00)]
    [InlineData("(500.50)", -500.50)]
    [InlineData("-1200", -1200.00)]
    [InlineData("10000 Dr", -10000.00)]
    [InlineData("25000 Cr", 25000.00)]
    public void AmountParsing_ShouldParseVariousFormats(string input, decimal expected)
    {
        var clean = input.Trim()
            .Replace("₹", "")
            .Replace("$", "")
            .Replace("Rs.", "", StringComparison.OrdinalIgnoreCase)
            .Replace("Rs", "", StringComparison.OrdinalIgnoreCase)
            .Replace("INR", "", StringComparison.OrdinalIgnoreCase)
            .Replace(",", "")
            .Trim();

        bool isNegative = false;
        if (clean.StartsWith("(") && clean.EndsWith(")"))
        {
            isNegative = true;
            clean = clean.Substring(1, clean.Length - 2).Trim();
        }
        else if (clean.EndsWith("Dr", StringComparison.OrdinalIgnoreCase))
        {
            clean = clean.Substring(0, clean.Length - 2).Trim();
            isNegative = true;
        }
        else if (clean.EndsWith("Cr", StringComparison.OrdinalIgnoreCase))
        {
            clean = clean.Substring(0, clean.Length - 2).Trim();
        }

        decimal.TryParse(clean, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed).Should().BeTrue();
        var actual = isNegative ? -Math.Abs(parsed) : parsed;
        actual.Should().Be(expected);
    }

    [Theory]
    [InlineData("=SUM(A1:A10)", "'=SUM(A1:A10)")]
    [InlineData("+12345", "'+12345")]
    [InlineData("-CMD", "'-CMD")]
    [InlineData("@HYPERLINK", "'@HYPERLINK")]
    [InlineData("Normal Text", "Normal Text")]
    public void FormulaInjection_ShouldEscapeDangerousLeadingCharacters(string input, string expected)
    {
        string escaped = input;
        if (input.StartsWith("=") || input.StartsWith("+") || input.StartsWith("-") || input.StartsWith("@") || input.StartsWith("\t"))
        {
            escaped = "'" + input;
        }

        escaped.Should().Be(expected);
    }

    [Fact]
    public void AutoMatchColumns_ShouldMatchSynonymsCorrectly()
    {
        var meta = _service.GetModuleMetadata("Transactions");
        var userHeaders = new List<string> { "Amt", "Txn Date", "Cr/Dr", "Cat", "Narration" };

        var map = new Dictionary<string, string>();
        foreach (var userH in userHeaders)
        {
            var cleanedUser = Regex.Replace(userH.ToLowerInvariant().Replace("*", "").Trim(), @"[\s_\-]+", "");

            foreach (var field in meta.Fields)
            {
                var cleanedField = Regex.Replace(field.Name.ToLowerInvariant(), @"[\s_\-]+", "");
                if (cleanedUser == cleanedField || field.Synonyms.Any(syn => Regex.Replace(syn.ToLowerInvariant(), @"[\s_\-]+", "") == cleanedUser))
                {
                    map[userH] = field.Name;
                    break;
                }
            }
        }

        map["Amt"].Should().Be("Amount");
        map["Txn Date"].Should().Be("Date");
        map["Cr/Dr"].Should().Be("Type");
        map["Cat"].Should().Be("Category");
        map["Narration"].Should().Be("Note");
    }

    [Theory]
    [InlineData("05-10-2026", "dd-MM-yyyy", 2026, 10, 5)]
    [InlineData("06-10-2026", "dd-MM-yyyy", 2026, 10, 6)]
    [InlineData("07-10-2026", "dd-MM-yyyy", 2026, 10, 7)]
    [InlineData("06-10-2026 12:00:00 AM", "dd-MM-yyyy", 2026, 10, 6)]
    [InlineData("07-10-2026 00:00:00", "dd-MM-yyyy", 2026, 10, 7)]
    [InlineData("06/10/2026", "dd/MM/yyyy", 2026, 10, 6)]
    [InlineData("2026-10-06", "yyyy-MM-dd", 2026, 10, 6)]
    [InlineData("06-10-2026", null, 2026, 10, 6)]
    [InlineData("07-10-2026", null, 2026, 10, 7)]
    public void TryParseDate_ShouldCorrectlyParseIndianDates(string input, string? preferredFormat, int expectedYear, int expectedMonth, int expectedDay)
    {
        var ok = DataTransferService.TryParseDate(input, preferredFormat, out var parsed);

        ok.Should().BeTrue();
        parsed.Year.Should().Be(expectedYear);
        parsed.Month.Should().Be(expectedMonth);
        parsed.Day.Should().Be(expectedDay);
    }

    [Theory]
    [InlineData("Salary", Hisaab.Domain.Enums.TransactionType.Income, "briefcase", "#16a34a")]
    [InlineData("Freelance Client", Hisaab.Domain.Enums.TransactionType.Income, "laptop", "#059669")]
    [InlineData("Bonus Diwali", Hisaab.Domain.Enums.TransactionType.Income, "gift", "#14b8a6")]
    [InlineData("Groceries", Hisaab.Domain.Enums.TransactionType.Expense, "shopping-cart", "#ea580c")]
    [InlineData("Electricity Bill", Hisaab.Domain.Enums.TransactionType.Expense, "zap", "#d97706")]
    [InlineData("Uber Taxi", Hisaab.Domain.Enums.TransactionType.Expense, "truck", "#ca8a04")]
    [InlineData("Custom Random", Hisaab.Domain.Enums.TransactionType.Income, "plus-circle", "#16a34a")]
    [InlineData("Custom Random", Hisaab.Domain.Enums.TransactionType.Expense, "tag", "#dc2626")]
    public void GetCategoryStyling_ShouldReturnAppropriateIconAndColor(string name, Hisaab.Domain.Enums.TransactionType type, string expectedIcon, string expectedColor)
    {
        var (icon, color) = DataTransferService.GetCategoryStyling(name, type);
        icon.Should().Be(expectedIcon);
        color.Should().Be(expectedColor);
    }

    [Fact]
    public void IsNonDataRow_ShouldIdentifyEmptyAndInstructionRows()
    {
        var emptyRow = new Dictionary<string, string> { ["Type"] = "", ["Amount"] = "  ", ["Date"] = "" };
        DataTransferService.IsNonDataRow(emptyRow).Should().BeTrue();

        var instructionRow1 = new Dictionary<string, string> { ["Type"] = "Income & Expense Transactions — Import Instructions", ["Amount"] = "" };
        DataTransferService.IsNonDataRow(instructionRow1).Should().BeTrue();

        var instructionRow2 = new Dictionary<string, string> { ["Type"] = "Field Name", ["Amount"] = "Required?", ["Category"] = "Data Type" };
        DataTransferService.IsNonDataRow(instructionRow2).Should().BeTrue();

        var realDataRow = new Dictionary<string, string> { ["Type"] = "Expensess", ["Amount"] = "10000", ["Category"] = "Home/Family", ["Date"] = "12/01/2023" };
        DataTransferService.IsNonDataRow(realDataRow).Should().BeFalse();
    }
}

