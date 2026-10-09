using Hisaab.Domain.Common;

namespace Hisaab.Domain.Entities;

public class EpfEntry : UserOwnedEntity
{
    /// <summary>
    /// Stored in UTC normalized to the 1st of the month (e.g. 2026-10-01 00:00:00 UTC).
    /// </summary>
    public DateTime Month { get; set; }

    /// <summary>
    /// Employee EPF Contribution (12% of basic + DA).
    /// </summary>
    public decimal EmployeeShare { get; set; }

    /// <summary>
    /// Employer EPF Contribution (3.67% of basic + DA).
    /// </summary>
    public decimal EmployerShare { get; set; }

    /// <summary>
    /// Employer Pension Scheme (EPS) Contribution (8.33% of basic + DA).
    /// </summary>
    public decimal PensionShare { get; set; }

    /// <summary>
    /// Interest credited for this month or annual interest settlement.
    /// </summary>
    public decimal Interest { get; set; }

    /// <summary>
    /// Amount withdrawn from EPF balance.
    /// </summary>
    public decimal Withdrawal { get; set; }

    /// <summary>
    /// Optional note or employer name / reference.
    /// </summary>
    public string? Note { get; set; }

    /// <summary>
    /// Net EPF inflow for this entry (Employee + Employer + Interest - Withdrawal).
    /// </summary>
    public decimal NetEpfInflow => EmployeeShare + EmployerShare + Interest - Withdrawal;
}

