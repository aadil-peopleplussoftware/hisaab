namespace Hisaab.Application.Common.Models;

public class PaginatedList<T>
{
    public IReadOnlyCollection<T> Items { get; }
    public int PageIndex { get; }
    public int TotalPages { get; }
    public int TotalCount { get; }
    public int PageSize { get; }

    public bool HasPreviousPage => PageIndex > 1;
    public bool HasNextPage => PageIndex < TotalPages;

    public PaginatedList(IReadOnlyCollection<T> items, int count, int pageIndex, int pageSize)
    {
        PageIndex = pageIndex < 1 ? 1 : pageIndex;
        PageSize = pageSize < 1 ? 10 : pageSize;
        TotalCount = count;
        TotalPages = (int)Math.Ceiling(count / (double)PageSize);
        Items = items;
    }

    public static PaginatedList<T> Create(IEnumerable<T> source, int count, int pageIndex, int pageSize)
    {
        return new PaginatedList<T>(source.ToList(), count, pageIndex, pageSize);
    }
}
