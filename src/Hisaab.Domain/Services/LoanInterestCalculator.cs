using Hisaab.Domain.Enums;

namespace Hisaab.Domain.Services;

public static class LoanInterestCalculator
{
    /// <summary>
    /// Calculates the accrued interest on a principal amount from startDate to asOfDate.
    /// Returns 0 if interest type is None, or if rate or duration is non-positive.
    /// </summary>
    public static decimal CalculateAccruedInterest(
        decimal principal,
        decimal annualRatePercent,
        LoanInterestType interestType,
        DateTime startDate,
        DateTime asOfDate)
    {
        if (principal <= 0 || annualRatePercent <= 0 || interestType == LoanInterestType.None)
        {
            return 0m;
        }

        if (asOfDate <= startDate)
        {
            return 0m;
        }

        var totalDays = (decimal)(asOfDate - startDate).TotalDays;
        if (totalDays <= 0)
        {
            return 0m;
        }

        var timeInYears = totalDays / 365m;

        switch (interestType)
        {
            case LoanInterestType.Simple:
                // I = (P * R * T) / 100
                var simpleInterest = (principal * annualRatePercent * timeInYears) / 100m;
                return Math.Round(simpleInterest, 2, MidpointRounding.AwayFromZero);

            case LoanInterestType.Compound:
                // Compounded monthly: A = P * (1 + R / (12 * 100))^(12 * T)
                // Using double for power calculation then converting back to decimal
                var rMonthly = (double)(annualRatePercent / (12m * 100m));
                var months = (double)(timeInYears * 12m);
                var amount = (double)principal * Math.Pow(1.0 + rMonthly, months);
                var compoundInterest = (decimal)amount - principal;
                return Math.Round(Math.Max(0m, compoundInterest), 2, MidpointRounding.AwayFromZero);

            case LoanInterestType.None:
            default:
                return 0m;
        }
    }

    /// <summary>
    /// Calculates the daily interest accrual on the given principal and annual rate.
    /// </summary>
    public static decimal CalculateDailyInterest(decimal principal, decimal annualRatePercent)
    {
        if (principal <= 0 || annualRatePercent <= 0)
        {
            return 0m;
        }

        var dailyRate = (principal * annualRatePercent) / (365m * 100m);
        return Math.Round(dailyRate, 2, MidpointRounding.AwayFromZero);
    }
}

