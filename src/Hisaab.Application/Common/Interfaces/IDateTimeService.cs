namespace Hisaab.Application.Common.Interfaces;

public interface IDateTimeService
{
    DateTime UtcNow { get; }
    DateTime NowInKolkata { get; }
    DateTime ToKolkataTime(DateTime utcDateTime);
    DateTime ToUtcFromKolkata(DateTime kolkataDateTime);
}
