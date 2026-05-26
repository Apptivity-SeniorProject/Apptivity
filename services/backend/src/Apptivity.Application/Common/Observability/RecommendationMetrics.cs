using System.Diagnostics.Metrics;

namespace Apptivity.Application.Common.Observability;

internal static class RecommendationMetrics
{
    private static readonly Meter Meter = new("Apptivity.Recommendations", "1.0.0");

    private static readonly Counter<long> RequestCounter = Meter.CreateCounter<long>(
        "recommended_requests_total",
        unit: "request",
        description: "Total recommended v6 requests.");

    private static readonly Counter<long> StageHitCounter = Meter.CreateCounter<long>(
        "recommended_stage_hits_total",
        unit: "request",
        description: "Counts which stage produced final results.");

    private static readonly Counter<long> EmptyResultCounter = Meter.CreateCounter<long>(
        "recommended_empty_results_total",
        unit: "request",
        description: "Counts requests that return no recommended items.");

    private static readonly Histogram<double> LatencyMsHistogram = Meter.CreateHistogram<double>(
        "recommended_latency_ms",
        unit: "ms",
        description: "Latency of recommended v6 endpoint processing.");

    public static void RecordRequest() => RequestCounter.Add(1);

    public static void RecordStageHit(int stage) => StageHitCounter.Add(1, KeyValuePair.Create<string, object?>("stage", stage));

    public static void RecordEmptyResult() => EmptyResultCounter.Add(1);

    public static void RecordLatency(double latencyMs) => LatencyMsHistogram.Record(latencyMs);
}
