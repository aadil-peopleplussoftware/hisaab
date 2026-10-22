using System.Globalization;
using System.Text.RegularExpressions;
using Hisaab.Application.Common.Interfaces;
using Hisaab.Application.Features.Epfo.DTOs;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;

namespace Hisaab.Infrastructure.Services;

public class EpfoPdfParserService : IEpfoPdfParserService
{
    public Task<EpfoPassbookParsePreviewDto> ParsePassbookPdfAsync(Stream pdfStream, CancellationToken cancellationToken = default)
    {
        if (pdfStream == null || pdfStream.Length == 0)
        {
            throw new ArgumentException("PDF stream is empty or invalid.", nameof(pdfStream));
        }

        using var memoryStream = new MemoryStream();
        pdfStream.CopyTo(memoryStream);
        memoryStream.Position = 0;

        using var document = PdfDocument.Open(memoryStream);
        if (document.NumberOfPages == 0)
        {
            throw new InvalidOperationException("The uploaded PDF does not contain any readable pages.");
        }

        var fullTextBuilder = new System.Text.StringBuilder();
        foreach (var page in document.GetPages())
        {
            cancellationToken.ThrowIfCancellationRequested();
            var pageText = ContentOrderTextExtractor.GetText(page);
            fullTextBuilder.AppendLine(pageText);
        }

        var fullText = fullTextBuilder.ToString();

        // 1. Header Information Parsing
        var estMatch = Regex.Match(fullText, @"Establishment ID/Name\s+([A-Z0-9]+)\s*/\s*([^\r\n]+)");
        var estId = estMatch.Success ? estMatch.Groups[1].Value.Trim() : "—";
        var estName = estMatch.Success ? estMatch.Groups[2].Value.Trim() : "—";

        var memMatch = Regex.Match(fullText, @"Member ID/Name\s+([A-Z0-9]+)\s*/\s*([^\r\n]+)");
        var memberId = memMatch.Success ? memMatch.Groups[1].Value.Trim() : "—";
        var memberName = memMatch.Success ? memMatch.Groups[2].Value.Trim() : "—";

        var uanMatch = Regex.Match(fullText, @"UAN\s*(\d+)");
        var uan = uanMatch.Success ? uanMatch.Groups[1].Value.Trim() : "—";

        var dobMatch = Regex.Match(fullText, @"Date of Birth\s*(\d{2}-\d{2}-\d{4})");
        var dob = dobMatch.Success ? dobMatch.Groups[1].Value.Trim() : "—";

        var fyMatch = Regex.Match(fullText, @"Financial Year\s*-\s*(\d{4}-\d{4})");
        var fy = fyMatch.Success ? fyMatch.Groups[1].Value.Trim() : "—";

        // 2. Opening Balance Parsing
        decimal obEe = 0m, obEr = 0m, obEps = 0m;
        var obMatch = Regex.Match(fullText, @"^OB\s+Int\.\s*Updated upto\s*\d{2}/\d{2}/\d{4}\s+([\d,]+(?:\.\d{2})?)\s+([\d,]+(?:\.\d{2})?)\s+([\d,]+(?:\.\d{2})?)", RegexOptions.Multiline);
        if (obMatch.Success)
        {
            obEe = ParseDecimal(obMatch.Groups[1].Value);
            obEr = ParseDecimal(obMatch.Groups[2].Value);
            obEps = ParseDecimal(obMatch.Groups[3].Value);
        }

        // 3. Raw Transaction Rows Parsing
        var rowRegex = new Regex(
            @"^(?<wageMonth>[A-Za-z]{3}-\d{4})\s+(?<txnDate>\d{2}-\d{2}-\d{4})\s+(?<type>CR|DR)\s+(?<particulars>.*?)\s+(?<epfWages>[\d,]+(?:\.\d{2})?)\s+(?<epsWages>[\d,]+(?:\.\d{2})?)\s+(?<eeShare>[\d,]+(?:\.\d{2})?)\s+(?<erShare>[\d,]+(?:\.\d{2})?)\s+(?<epsShare>[\d,]+(?:\.\d{2})?)\s*$",
            RegexOptions.Multiline);

        var rawTransactions = new List<ParsedEpfoRawTransactionDto>();
        var matches = rowRegex.Matches(fullText);

        foreach (Match m in matches)
        {
            rawTransactions.Add(new ParsedEpfoRawTransactionDto(
                m.Groups["wageMonth"].Value,
                m.Groups["txnDate"].Value,
                m.Groups["type"].Value,
                m.Groups["particulars"].Value.Trim(),
                ParseDecimal(m.Groups["epfWages"].Value),
                ParseDecimal(m.Groups["epsWages"].Value),
                ParseDecimal(m.Groups["eeShare"].Value),
                ParseDecimal(m.Groups["erShare"].Value),
                ParseDecimal(m.Groups["epsShare"].Value)
            ));
        }

        // 4. Totals / Summary Parsing
        decimal totalContribEe = 0m, totalContribEr = 0m, totalContribEps = 0m;
        var contribMatch = Regex.Match(fullText, @"Total Contributions for the year\s*\[\s*\d{4}\s*\]\s+([\d,]+(?:\.\d{2})?)\s+([\d,]+(?:\.\d{2})?)\s+([\d,]+(?:\.\d{2})?)");
        if (contribMatch.Success)
        {
            totalContribEe = ParseDecimal(contribMatch.Groups[1].Value);
            totalContribEr = ParseDecimal(contribMatch.Groups[2].Value);
            totalContribEps = ParseDecimal(contribMatch.Groups[3].Value);
        }
        else
        {
            totalContribEe = rawTransactions.Sum(t => t.EmployeeShare);
            totalContribEr = rawTransactions.Sum(t => t.EmployerShare);
            totalContribEps = rawTransactions.Sum(t => t.PensionShare);
        }

        // 5. Annual Interest
        decimal annualIntEe = 0m, annualIntEr = 0m;
        var intMatch = Regex.Match(fullText, @"^Int\.\s*Updated upto\s*\d{2}/\d{2}/\d{4}\s+([\d,]+(?:\.\d{2})?)\s+([\d,]+(?:\.\d{2})?)\s+([\d,]+(?:\.\d{2})?)", RegexOptions.Multiline);
        if (intMatch.Success)
        {
            annualIntEe = ParseDecimal(intMatch.Groups[1].Value);
            annualIntEr = ParseDecimal(intMatch.Groups[2].Value);
        }

        // 6. Closing Balance
        decimal closeEe = 0m, closeEr = 0m, closeEps = 0m;
        var closeMatch = Regex.Match(fullText, @"Closing Balance as on\s*\d{2}/\d{2}/\d{4}\s+([\d,]+(?:\.\d{2})?)\s+([\d,]+(?:\.\d{2})?)\s+([\d,]+(?:\.\d{2})?)");
        if (closeMatch.Success)
        {
            closeEe = ParseDecimal(closeMatch.Groups[1].Value);
            closeEr = ParseDecimal(closeMatch.Groups[2].Value);
            closeEps = ParseDecimal(closeMatch.Groups[3].Value);
        }
        else
        {
            closeEe = obEe + totalContribEe + annualIntEe;
            closeEr = obEr + totalContribEr + annualIntEr;
            closeEps = obEps + totalContribEps;
        }

        // 7. Group into Monthly Normalized Entries for Hisaab
        var monthlyMap = new Dictionary<string, (DateTime MonthDate, decimal Ee, decimal Er, decimal Eps, List<string> Particulars)>();

        foreach (var txn in rawTransactions)
        {
            if (!DateTime.TryParseExact(txn.WageMonth, "MMM-yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
            {
                continue;
            }

            var normalizedMonth = new DateTime(parsedDate.Year, parsedDate.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var key = txn.WageMonth;

            if (!monthlyMap.ContainsKey(key))
            {
                monthlyMap[key] = (normalizedMonth, txn.EmployeeShare, txn.EmployerShare, txn.PensionShare, new List<string> { txn.Particulars });
            }
            else
            {
                var cur = monthlyMap[key];
                cur.Particulars.Add(txn.Particulars);
                monthlyMap[key] = (normalizedMonth, cur.Ee + txn.EmployeeShare, cur.Er + txn.EmployerShare, cur.Eps + txn.PensionShare, cur.Particulars);
            }
        }

        var monthlyEntries = new List<ParsedEpfoMonthlyEntryDto>();

        foreach (var kvp in monthlyMap.OrderBy(k => k.Value.MonthDate))
        {
            var data = kvp.Value;
            var monthLabel = data.MonthDate.ToString("MMM yyyy", CultureInfo.InvariantCulture);

            var noteParts = new List<string>();
            if (!string.IsNullOrWhiteSpace(estName) && estName != "—")
            {
                noteParts.Add(estName);
            }
            if (data.Particulars.Count == 1)
            {
                noteParts.Add(data.Particulars[0]);
            }
            else if (data.Particulars.Count > 1)
            {
                noteParts.Add($"Consolidated {data.Particulars.Count} transactions: {string.Join(" + ", data.Particulars)}");
            }

            var note = string.Join(" | ", noteParts);

            monthlyEntries.Add(new ParsedEpfoMonthlyEntryDto(
                data.MonthDate,
                monthLabel,
                data.Ee,
                data.Er,
                data.Eps,
                0m, // Interest attached separately or to March
                0m, // Withdrawal
                data.Ee + data.Er, // Net Inflow
                note
            ));
        }

        // Attach annual interest if present (total interest = EE interest + ER interest)
        var totalAnnualInterest = annualIntEe + annualIntEr;
        if (totalAnnualInterest > 0)
        {
            // Determine fiscal year end month (March of second year in FY, e.g. 2024 for "2023-2024")
            int interestYear = DateTime.UtcNow.Year;
            if (fy.Contains('-'))
            {
                var parts = fy.Split('-');
                if (parts.Length == 2 && int.TryParse(parts[1], out var parsedEndYear))
                {
                    interestYear = parsedEndYear;
                }
            }
            else if (monthlyEntries.Any())
            {
                interestYear = monthlyEntries.Max(e => e.Month.Year);
            }

            var marchDate = new DateTime(interestYear, 3, 1, 0, 0, 0, DateTimeKind.Utc);
            var marchIdx = monthlyEntries.FindIndex(e => e.Month.Year == marchDate.Year && e.Month.Month == 3);

            if (marchIdx >= 0)
            {
                var existing = monthlyEntries[marchIdx];
                monthlyEntries[marchIdx] = existing with
                {
                    Interest = totalAnnualInterest,
                    NetInflow = existing.NetInflow + totalAnnualInterest,
                    Note = $"{existing.Note} | EPFO Annual Interest: ₹{totalAnnualInterest:N0} (EE: ₹{annualIntEe:N0}, ER: ₹{annualIntEr:N0})"
                };
            }
            else
            {
                var intNote = $"EPFO Annual Interest Settlement ({fy}) | EE: ₹{annualIntEe:N0}, ER: ₹{annualIntEr:N0}";
                if (!string.IsNullOrWhiteSpace(estName) && estName != "—")
                {
                    intNote = $"{estName} | {intNote}";
                }

                monthlyEntries.Add(new ParsedEpfoMonthlyEntryDto(
                    marchDate,
                    marchDate.ToString("MMM yyyy", CultureInfo.InvariantCulture),
                    0m,
                    0m,
                    0m,
                    totalAnnualInterest,
                    0m,
                    totalAnnualInterest,
                    intNote
                ));

                monthlyEntries = monthlyEntries.OrderBy(e => e.Month).ToList();
            }
        }

        var result = new EpfoPassbookParsePreviewDto(
            estId,
            estName,
            memberId,
            memberName,
            dob,
            uan,
            fy,
            obEe,
            obEr,
            obEps,
            totalContribEe,
            totalContribEr,
            totalContribEps,
            annualIntEe,
            annualIntEr,
            closeEe,
            closeEr,
            closeEps,
            rawTransactions,
            monthlyEntries
        );

        return Task.FromResult(result);
    }

    private static decimal ParseDecimal(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return 0m;
        var clean = raw.Replace(",", "").Trim();
        return decimal.TryParse(clean, NumberStyles.Any, CultureInfo.InvariantCulture, out var val) ? val : 0m;
    }
}

