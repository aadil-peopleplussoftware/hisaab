using System.Globalization;

namespace Hisaab.Domain.ValueObjects;

public readonly record struct Money : IComparable<Money>, IComparable
{
    private static readonly CultureInfo IndianCulture = new("en-IN");

    public decimal Amount { get; }
    public string Currency { get; }

    public static Money Zero => new(0m);

    public Money(decimal amount, string currency = "INR")
    {
        if (string.IsNullOrWhiteSpace(currency))
        {
            currency = "INR";
        }

        Amount = Math.Round(amount, 2, MidpointRounding.AwayFromZero);
        Currency = currency.Trim().ToUpperInvariant();
    }

    public static Money From(decimal amount, string currency = "INR") => new(amount, currency);

    public static Money operator +(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return new Money(left.Amount + right.Amount, left.Currency);
    }

    public static Money operator -(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return new Money(left.Amount - right.Amount, left.Currency);
    }

    public static Money operator *(Money money, decimal multiplier) =>
        new(money.Amount * multiplier, money.Currency);

    public static Money operator *(decimal multiplier, Money money) =>
        new(money.Amount * multiplier, money.Currency);

    public static Money operator /(Money money, decimal divisor)
    {
        if (divisor == 0)
        {
            throw new DivideByZeroException("Cannot divide money by zero.");
        }

        return new Money(money.Amount / divisor, money.Currency);
    }

    public static bool operator <(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return left.Amount < right.Amount;
    }

    public static bool operator >(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return left.Amount > right.Amount;
    }

    public static bool operator <=(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return left.Amount <= right.Amount;
    }

    public static bool operator >=(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return left.Amount >= right.Amount;
    }

    public int CompareTo(Money other)
    {
        EnsureSameCurrency(this, other);
        return Amount.CompareTo(other.Amount);
    }

    public int CompareTo(object? obj)
    {
        if (obj is null) return 1;
        if (obj is Money other) return CompareTo(other);
        throw new ArgumentException("Object is not a Money instance", nameof(obj));
    }

    public string ToIndianFormat()
    {
        // Format as ₹1,25,000.00
        var formatted = Amount.ToString("N2", IndianCulture);
        return $"₹{formatted}";
    }

    public override string ToString() => ToIndianFormat();

    private static void EnsureSameCurrency(Money left, Money right)
    {
        if (!string.Equals(left.Currency, right.Currency, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Cannot operate on money with different currencies: '{left.Currency}' and '{right.Currency}'.");
        }
    }
}
