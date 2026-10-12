namespace Hisaab.Domain.Entities;

public class UserDeletionSetting
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public bool Transactions { get; set; } = true;
    public bool Categories { get; set; } = true;
    public bool Loans { get; set; } = true;
    public bool Epfo { get; set; } = true;
    public bool Investments { get; set; } = true;
    public bool Business { get; set; } = true;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

