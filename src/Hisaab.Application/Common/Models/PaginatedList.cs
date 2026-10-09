using System.Text.Json.Serialization;

namespace Hisaab.Application.Common.Models;

public class PaginatedList<T>
{
    public IReadOnlyCollection<T> Items { get; init; } = Array.Empty<T>();
    public int PageIndex { get; init; } = 1;
    public int TotalPages { get; init; }
    public int TotalCount { get; init; }
    public int PageSize { get; init; } = 20;

    public bool HasPreviousPage => PageIndex > 1;
    public bool HasNextPage => PageIndex < TotalPages;

    public PaginatedList() { }

    [JsonConstructor]
    public PaginatedList(IReadOnlyCollection<T> items, int totalCount, int pageIndex, int pageSize)
    {
        PageIndex = pageIndex < 1 ? 1 : pageIndex;
        PageSize = pageSize < 1 ? 10 : pageSize;
        TotalCount = totalCount;
        TotalPages = (int)Math.Ceiling(totalCount / (double)PageSize);
        Items = items;
    }

    public static PaginatedList<T> Create(IEnumerable<T> source, int count, int pageIndex, int pageSize)
    {
        return new PaginatedList<T>(source.ToList(), count, pageIndex, pageSize);
    }
}
