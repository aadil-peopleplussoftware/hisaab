using FluentValidation;

namespace Hisaab.Application.Features.Dashboard.Queries.GetDashboard;

public class GetDashboardQueryValidator : AbstractValidator<GetDashboardQuery>
{
    public GetDashboardQueryValidator()
    {
        RuleFor(x => x.Month)
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .When(x => !string.IsNullOrWhiteSpace(x.Month))
            .WithMessage("Month must be in 'yyyy-MM' format (e.g. 2026-10).");

        RuleFor(x => x.TrendMonths)
            .InclusiveBetween(3, 24)
            .WithMessage("Trend months must be between 3 and 24.");
    }
}
