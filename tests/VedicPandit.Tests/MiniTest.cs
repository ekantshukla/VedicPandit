// A minimal, dependency-free stand-in for the parts of xUnit these tests use ([Fact], [Theory],
// [InlineData], Assert.*), plus a runner. Keeps the test project buildable with only the .NET SDK.
// If you prefer real xUnit later, delete this file and add the xunit packages back; the tests compile unchanged.
using System.Diagnostics;
using System.Reflection;

namespace Xunit
{
    [AttributeUsage(AttributeTargets.Method)] public class FactAttribute : Attribute { }
    [AttributeUsage(AttributeTargets.Method)] public class TheoryAttribute : FactAttribute { }
    [AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
    public class InlineDataAttribute : Attribute
    {
        public object?[] Data { get; }
        public InlineDataAttribute(params object?[] data) => Data = data;
    }

    public class AssertException : Exception { public AssertException(string m) : base(m) { } }

    public static class Assert
    {
        public static void True(bool c, string? msg = null) { if (!c) throw new AssertException(msg ?? "Expected true"); }
        public static void False(bool c, string? msg = null) { if (c) throw new AssertException(msg ?? "Expected false"); }
        public static void NotNull(object? o) { if (o is null) throw new AssertException("Expected a value, got null"); }
        public static void Equal<T>(T expected, T actual)
        { if (!EqualityComparer<T>.Default.Equals(expected, actual)) throw new AssertException($"Expected <{expected}>, got <{actual}>"); }
        public static void NotEmpty<T>(IEnumerable<T> items) { if (!items.Any()) throw new AssertException("Expected a non-empty collection"); }
        public static void Contains<T>(IEnumerable<T> items, Func<T, bool> pred)
        { if (!items.Any(pred)) throw new AssertException($"No matching item in [{string.Join(", ", items)}]"); }
        public static void DoesNotContain<T>(IEnumerable<T> items, Func<T, bool> pred)
        { var hit = items.FirstOrDefault(pred); if (hit is not null && items.Any(pred)) throw new AssertException($"Unexpected item <{hit}>"); }
        public static void Contains(string expectedSubstring, string? actual)
        { if (actual is null || !actual.Contains(expectedSubstring)) throw new AssertException($"Expected text containing <{expectedSubstring}>, got <{actual}>"); }
    }
}

namespace VedicPandit.Tests
{
    public static class Runner
    {
        public static async Task<int> Main(string[] args)
        {
            var filter = args.FirstOrDefault();
            int pass = 0, fail = 0;
            var sw = Stopwatch.StartNew();
            var methods = typeof(Runner).Assembly.GetTypes()
                .Where(t => t.IsClass && t.IsPublic && !t.IsAbstract)
                .SelectMany(t => t.GetMethods(BindingFlags.Public | BindingFlags.Instance).Select(m => (t, m)))
                .Where(x => x.m.GetCustomAttribute<Xunit.FactAttribute>() is not null)
                .OrderBy(x => x.t.Name).ThenBy(x => x.m.Name);

            foreach (var (type, method) in methods)
            {
                var rows = method.GetCustomAttributes<Xunit.InlineDataAttribute>().Select(a => a.Data).ToList();
                if (rows.Count == 0) rows.Add(Array.Empty<object?>());
                foreach (var row in rows)
                {
                    var name = $"{type.Name}.{method.Name}" + (row.Length > 0 ? $"({string.Join(", ", row)})" : "");
                    if (filter is not null && !name.Contains(filter, StringComparison.OrdinalIgnoreCase)) continue;
                    try
                    {
                        var instance = Activator.CreateInstance(type);
                        var args2 = method.GetParameters().Select((p, i) => Convert.ChangeType(row[i], p.ParameterType)).ToArray();
                        var result = method.Invoke(instance, args2);
                        if (result is Task task) await task;
                        Console.WriteLine($"  PASS  {name}");
                        pass++;
                    }
                    catch (Exception ex)
                    {
                        var e = ex is TargetInvocationException { InnerException: { } inner } ? inner : ex;
                        Console.WriteLine($"  FAIL  {name}\n        {e.GetType().Name}: {e.Message}");
                        fail++;
                    }
                }
            }
            Console.WriteLine($"\n{pass} passed, {fail} failed in {sw.Elapsed.TotalSeconds:F1}s");
            return fail == 0 ? 0 : 1;
        }
    }
}
