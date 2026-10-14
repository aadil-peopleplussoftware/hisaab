namespace Hisaab.Domain.Enums;

public enum TransactionType
{
    Income = 1,
    Expense = 2
}

public enum LoanDirection
{
    Given = 1,
    Taken = 2
}

public enum LoanInterestType
{
    None = 0,
    Simple = 1,
    Compound = 2
}

public enum LoanStatus
{
    Active = 1,
    Closed = 2
}

public enum LoanPriority
{
    Low = 1,
    Medium = 2,
    High = 3,
    Urgent = 4
}

public enum LoanTransactionKind
{
    Disburse = 1,
    Repayment = 2,
    Interest = 3,
    Penalty = 4
}

public enum InvestmentType
{
    MutualFund = 1,
    Stock = 2,
    FixedDeposit = 3,
    RecurringDeposit = 4,
    PPF = 5,
    NPS = 6,
    Gold = 7,
    Other = 8
}

public enum InvestmentTransactionKind
{
    Buy = 1,
    Sell = 2,
    Dividend = 3
}
