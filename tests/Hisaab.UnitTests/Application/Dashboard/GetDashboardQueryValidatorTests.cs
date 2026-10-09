using FluentAssertions;
using Hisaab.Application.Features.Dashboard.Queries.GetDashboard;
using Xunit;

namespace Hisaab.UnitTests.Application.Dashboard;

public class GetDashboardQueryValidatorTests
{
    private readonly GetDashboardQueryValidator _validator = new();

    [Theory]
    [InlineData("2026-01")]
    [InlineData("2026-10")]
    [InlineData("2026-12")]
    [InlineData(null)]
    [InlineData("")]
    public void Validator_ShouldPass_ForValidOrNullMonth(string? month)
    {
        var query = new GetDashboardQuery(month, 6);
        var result = _validator.Validate(query);

        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("2026-00")]
    [InlineData("2026-13")]
    [InlineData("2026/10")]
    [InlineData("October 2026")]
    [InlineData("invalid-month")]
    public void Validator_ShouldFail_ForInvalidMonthFormat(string month)
    {
        var query = new GetDashboardQuery(month, 6);
        var result = _validator.Validate(query);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Month");
    }

    [Theory]
    [InlineData(3)]
    [InlineData(6)]
    [InlineData(12)]
    [InlineData(24)]
    public void Validator_ShouldPass_ForValidTrendMonths(int trendMonths)
    {
        var query = new GetDashboardQuery("2026-10", trendMonths);
        var result = _validator.Validate(query);

        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(25)]
    [InlineData(0)]
    public void Validator_ShouldFail_ForOutOfRangeTrendMonths(int trendMonths)
    {
        var query = new GetDashboardQuery("2026-10", trendMonths);
        var result = _validator.Validate(query);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "TrendMonths");
    }
}
