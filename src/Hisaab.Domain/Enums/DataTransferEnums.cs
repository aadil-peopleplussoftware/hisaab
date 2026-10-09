namespace Hisaab.Domain.Enums;

public enum ImportBatchStatus
{
    Pending = 1,
    Validating = 2,
    Ready = 3,
    Importing = 4,
    Completed = 5,
    Failed = 6,
    RolledBack = 7
}

public enum ImportMode
{
    AddNewOnly = 1,
    UpdateExisting = 2
}

