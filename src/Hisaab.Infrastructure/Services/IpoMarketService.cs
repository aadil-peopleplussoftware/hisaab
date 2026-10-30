using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.TradeDesk.DTOs;
using Microsoft.Extensions.Logging;

namespace Hisaab.Infrastructure.Services;

public class IpoMarketService : IIpoMarketService
{
    private readonly ILogger<IpoMarketService> _logger;

    private static readonly List<LiveIpoDto> MasterIpos = new()
    {
        // Active / Recent Hot Indian IPOs
        new LiveIpoDto("NTPC Green Energy Ltd", "NTPCGREEN", "Mainboard", 102m, 108m, 138, 10000m, "Open", "2024-11-19", "2024-11-22", "2024-11-27"),
        new LiveIpoDto("Swiggy Ltd", "SWIGGY", "Mainboard", 371m, 390m, 38, 11327m, "Listed", "2024-11-06", "2024-11-08", "2024-11-13"),
        new LiveIpoDto("Hyundai Motor India Ltd", "HYUNDAI", "Mainboard", 1865m, 1960m, 7, 27870m, "Listed", "2024-10-15", "2024-10-17", "2024-10-22"),
        new LiveIpoDto("Waaree Energies Ltd", "WAAREE", "Mainboard", 1427m, 1503m, 9, 4321m, "Listed", "2024-10-21", "2024-10-23", "2024-10-28"),
        new LiveIpoDto("Afcons Infrastructure Ltd", "AFCONS", "Mainboard", 440m, 463m, 32, 5430m, "Listed", "2024-10-25", "2024-10-29", "2024-11-04"),
        new LiveIpoDto("Sagility India Ltd", "SAGILITY", "Mainboard", 28m, 30m, 500, 2106m, "Listed", "2024-11-05", "2024-11-07", "2024-11-12"),
        new LiveIpoDto("ACME Solar Holdings Ltd", "ACMESOLAR", "Mainboard", 275m, 289m, 51, 2900m, "Listed", "2024-11-06", "2024-11-08", "2024-11-13"),
        new LiveIpoDto("Zinka Logistics Solutions Ltd (BlackBuck)", "BLACKBUCK", "Mainboard", 259m, 273m, 54, 1114m, "Open", "2024-11-13", "2024-11-18", "2024-11-21"),
        new LiveIpoDto("Enviro Infra Engineers Ltd", "ENVIRO", "Mainboard", 140m, 148m, 101, 650m, "Upcoming", "2024-11-22", "2024-11-26", "2024-11-29"),
        new LiveIpoDto("Suraksha Diagnostic Ltd", "SURAKSHA", "Mainboard", 420m, 441m, 34, 846m, "Upcoming", "2024-11-29", "2024-12-03", "2024-12-06"),
        new LiveIpoDto("Vishal Mega Mart Ltd", "VISHAL", "Mainboard", 74m, 78m, 190, 8000m, "Upcoming", "2024-12-11", "2024-12-13", "2024-12-18"),
        new LiveIpoDto("Senores Pharmaceuticals Ltd", "SENORES", "Mainboard", 372m, 391m, 38, 550m, "Upcoming", "2024-12-05", "2024-12-09", "2024-12-12"),
        new LiveIpoDto("Carraro India Ltd", "CARRARO", "Mainboard", 310m, 326m, 46, 1812m, "Upcoming", "2024-12-18", "2024-12-20", "2024-12-26"),
        new LiveIpoDto("Avanse Financial Services Ltd", "AVANSE", "Mainboard", 500m, 525m, 28, 3500m, "Upcoming", "2025-01-10", "2025-01-14", "2025-01-17"),
        new LiveIpoDto("Mamata Machinery Ltd", "MAMATA", "Mainboard", 230m, 242m, 60, 500m, "Upcoming", "2024-12-16", "2024-12-18", "2024-12-23"),
        new LiveIpoDto("Unimech Aerospace and Manufacturing Ltd", "UNIMECH", "Mainboard", 310m, 325m, 45, 500m, "Upcoming", "2025-01-15", "2025-01-17", "2025-01-22"),
        new LiveIpoDto("Ather Energy Ltd", "ATHER", "Mainboard", 290m, 310m, 48, 4500m, "Upcoming", "2025-02-05", "2025-02-07", "2025-02-12"),
        new LiveIpoDto("Mobikwik (One Mobikwik Systems Ltd)", "MOBIKWIK", "Mainboard", 265m, 279m, 53, 700m, "Upcoming", "2024-12-10", "2024-12-12", "2024-12-17"),
        new LiveIpoDto("Hero Fincorp Ltd", "HEROFIN", "Mainboard", 450m, 480m, 31, 3668m, "Upcoming", "2025-01-20", "2025-01-22", "2025-01-27"),
        new LiveIpoDto("HDB Financial Services Ltd", "HDBFS", "Mainboard", 700m, 740m, 20, 12500m, "Upcoming", "2025-02-18", "2025-02-20", "2025-02-25"),
        new LiveIpoDto("NSDL (National Securities Depository Ltd)", "NSDL", "Mainboard", 520m, 550m, 27, 4500m, "Upcoming", "2025-02-25", "2025-02-27", "2025-03-04"),
        new LiveIpoDto("Bajaj Housing Finance Ltd", "BAJAJHFL", "Mainboard", 66m, 70m, 214, 6560m, "Listed", "2024-09-09", "2024-09-11", "2024-09-16"),
        new LiveIpoDto("Premier Energies Ltd", "PREMIERENE", "Mainboard", 427m, 450m, 33, 2830m, "Listed", "2024-08-27", "2024-08-29", "2024-09-03"),
        new LiveIpoDto("Northern Arc Capital Ltd", "NORTHARC", "Mainboard", 249m, 263m, 57, 777m, "Listed", "2024-09-16", "2024-09-19", "2024-09-24"),
        new LiveIpoDto("KRN Heat Exchanger Ltd", "KRN", "Mainboard", 209m, 220m, 65, 342m, "Listed", "2024-09-25", "2024-09-27", "2024-10-03"),

        // SME IPOs
        new LiveIpoDto("C2C Advanced Systems Ltd", "C2C", "Sme", 214m, 226m, 600, 99m, "Open", "2024-11-22", "2024-11-26", "2024-11-29"),
        new LiveIpoDto("Rajesh Power Services Ltd", "RAJESHPOW", "Sme", 319m, 335m, 400, 160m, "Open", "2024-11-25", "2024-11-27", "2024-12-02"),
        new LiveIpoDto("Apex Ecotech Ltd", "APEXECO", "Sme", 71m, 73m, 1600, 25m, "Upcoming", "2024-11-27", "2024-11-29", "2024-12-04"),
        new LiveIpoDto("Rajputana Biodiesel Ltd", "RAJPUTANA", "Sme", 123m, 130m, 1000, 24m, "Upcoming", "2024-11-26", "2024-11-28", "2024-12-03"),
        new LiveIpoDto("Ganesh Green Bharat Ltd", "GANESHGB", "Sme", 181m, 190m, 600, 125m, "Listed", "2024-07-05", "2024-07-09", "2024-07-12"),
        new LiveIpoDto("Resourceful Automobile Ltd", "RESOURCE", "Sme", 117m, 117m, 1200, 12m, "Listed", "2024-08-22", "2024-08-26", "2024-08-29")
    };

    public IpoMarketService(ILogger<IpoMarketService> logger)
    {
        _logger = logger;
    }

    public Task<List<LiveIpoDto>> GetLiveIposAsync(string? query = null, CancellationToken ct = default)
    {
        var trimmed = (query ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            return Task.FromResult(MasterIpos);
        }

        var results = MasterIpos.Where(ipo =>
            ipo.CompanyName.Contains(trimmed, StringComparison.OrdinalIgnoreCase) ||
            ipo.Symbol.Contains(trimmed, StringComparison.OrdinalIgnoreCase) ||
            ipo.IssueType.Contains(trimmed, StringComparison.OrdinalIgnoreCase) ||
            ipo.Status.Contains(trimmed, StringComparison.OrdinalIgnoreCase)
        ).ToList();

        return Task.FromResult(results);
    }
}

