using Hisaab.Application.Common.Interfaces;

namespace Hisaab.Infrastructure.Services;

public class DateTimeService : IDateTimeService
{
    private static readonly TimeZoneInfo KolkataTimeZone = ResolveKolkataTimeZone();

    public DateTime UtcNow => DateTime.UtcNow;

    public DateTime NowInKolkata => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, KolkataTimeZone);

    public DateTime ToKolkataTime(DateTime utcDateTime)
    {
        var utc = DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc);
        return TimeZoneInfo.ConvertTimeFromUtc(utc, KolkataTimeZone);
    }

    public DateTime ToUtcFromKolkata(DateTime kolkataDateTime)
    {
        var unspecified = DateTime.SpecifyKind(kolkataDateTime, DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(unspecified, KolkataTimeZone);
    }

    private static TimeZoneInfo ResolveKolkataTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata");
        }
        catch (TimeZoneNotFoundException)
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
            }
            catch
            {
                return TimeZoneInfo.CreateCustomTimeZone("Asia/Kolkata", TimeSpan.FromHours(5.5), "IST", "IST");
            }
        }
    }
}

