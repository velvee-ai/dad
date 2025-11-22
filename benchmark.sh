#!/bin/bash

# Performance benchmark script for Cloudflare Workers vs AWS Lambda

# Configuration
ITERATIONS=50
CF_URL="https://daad-worker.sathish-257.workers.dev/api/health"
AWS_URL="https://32ia4c6b7eykifeo6qitra5maq0rtkgf.lambda-url.ap-south-1.on.aws/api/health"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "================================"
echo "Performance Benchmark Test"
echo "================================"
echo "Iterations: $ITERATIONS per platform"
echo "================================"
echo ""

# Function to calculate statistics
calculate_stats() {
    local times=("$@")
    local sorted=($(printf '%s\n' "${times[@]}" | sort -n))
    local count=${#sorted[@]}

    # Min and Max
    local min=${sorted[0]}
    local max=${sorted[$count-1]}

    # Average
    local avg=$(printf '%s\n' "${times[@]}" | awk '{sum+=$1} END {printf "%.6f", sum/NR}')

    # Median (P50)
    local p50_idx=$((count/2))
    local p50=${sorted[$p50_idx]}

    # P95
    local p95_idx=$((count*95/100))
    local p95=${sorted[$p95_idx]}

    # P99
    local p99_idx=$((count*99/100))
    local p99=${sorted[$p99_idx]}

    echo "$min $max $avg $p50 $p95 $p99"
}

# Test Cloudflare Workers
echo -e "${BLUE}Testing Cloudflare Workers...${NC}"
echo "URL: $CF_URL"
echo ""

declare -a cf_times
for i in $(seq 1 $ITERATIONS); do
    time=$(curl -w "%{time_total}" -o /dev/null -s $CF_URL 2>&1)
    cf_times+=($time)

    # Progress indicator
    if (( $i % 10 == 0 )); then
        echo "  Progress: $i/$ITERATIONS"
    fi
done
echo -e "${GREEN}✓ Cloudflare Workers test complete${NC}"
echo ""

# Test AWS Lambda
echo -e "${BLUE}Testing AWS Lambda...${NC}"
echo "URL: $AWS_URL"
echo ""

declare -a aws_times
for i in $(seq 1 $ITERATIONS); do
    time=$(curl -w "%{time_total}" -o /dev/null -s $AWS_URL 2>&1)
    aws_times+=($time)

    # Progress indicator
    if (( $i % 10 == 0 )); then
        echo "  Progress: $i/$ITERATIONS"
    fi
done
echo -e "${GREEN}✓ AWS Lambda test complete${NC}"
echo ""

# Calculate statistics
echo "================================"
echo "Results"
echo "================================"
echo ""

cf_stats=($(calculate_stats "${cf_times[@]}"))
aws_stats=($(calculate_stats "${aws_times[@]}"))

# Display results
echo -e "${YELLOW}Cloudflare Workers:${NC}"
echo "  Min:     ${cf_stats[0]}s"
echo "  Max:     ${cf_stats[1]}s"
echo "  Average: ${cf_stats[2]}s"
echo "  Median:  ${cf_stats[3]}s"
echo "  P95:     ${cf_stats[4]}s"
echo "  P99:     ${cf_stats[5]}s"
echo ""

echo -e "${YELLOW}AWS Lambda:${NC}"
echo "  Min:     ${aws_stats[0]}s"
echo "  Max:     ${aws_stats[1]}s"
echo "  Average: ${aws_stats[2]}s"
echo "  Median:  ${aws_stats[3]}s"
echo "  P95:     ${aws_stats[4]}s"
echo "  P99:     ${aws_stats[5]}s"
echo ""

# Compare results
echo "================================"
echo "Comparison"
echo "================================"
echo ""

cf_avg=${cf_stats[2]}
aws_avg=${aws_stats[2]}

# Determine winner
if (( $(echo "$cf_avg < $aws_avg" | bc -l) )); then
    diff=$(echo "scale=2; ($aws_avg - $cf_avg) / $cf_avg * 100" | bc)
    improvement_time=$(echo "scale=6; $aws_avg - $cf_avg" | bc)
    echo -e "${GREEN}Winner: Cloudflare Workers${NC}"
    echo "  Cloudflare is ${diff}% faster"
    echo "  Average improvement: ${improvement_time}s per request"
else
    diff=$(echo "scale=2; ($cf_avg - $aws_avg) / $aws_avg * 100" | bc)
    improvement_time=$(echo "scale=6; $cf_avg - $aws_avg" | bc)
    echo -e "${GREEN}Winner: AWS Lambda${NC}"
    echo "  AWS Lambda is ${diff}% faster"
    echo "  Average improvement: ${improvement_time}s per request"
fi
echo ""

# Detailed comparison
echo "================================"
echo "Detailed Metrics Comparison"
echo "================================"
echo ""

printf "%-15s %-15s %-15s %-15s\n" "Metric" "Cloudflare" "AWS Lambda" "Difference"
printf "%-15s %-15s %-15s %-15s\n" "------" "----------" "----------" "----------"

for i in 0 1 2 3 4 5; do
    metric_names=("Min" "Max" "Average" "Median" "P95" "P99")
    cf_val=${cf_stats[$i]}
    aws_val=${aws_stats[$i]}
    diff=$(echo "scale=6; $cf_val - $aws_val" | bc)

    # Format with positive/negative indicator
    if (( $(echo "$diff < 0" | bc -l) )); then
        diff_str="${diff}s (CF faster)"
    elif (( $(echo "$diff > 0" | bc -l) )); then
        diff_str="+${diff}s (AWS faster)"
    else
        diff_str="0s (tie)"
    fi

    printf "%-15s %-15s %-15s %-15s\n" "${metric_names[$i]}" "${cf_val}s" "${aws_val}s" "$diff_str"
done

echo ""
echo "================================"
echo "Summary"
echo "================================"
echo ""

# Calculate total time for 1 million requests
cf_total_1m=$(echo "scale=2; $cf_avg * 1000000" | bc)
aws_total_1m=$(echo "scale=2; $aws_avg * 1000000" | bc)

echo "Estimated time for 1 million requests:"
echo "  Cloudflare: $(echo "scale=2; $cf_total_1m / 3600" | bc) hours"
echo "  AWS Lambda: $(echo "scale=2; $aws_total_1m / 3600" | bc) hours"
echo ""

# Export results to CSV
CSV_FILE="benchmark_results_$(date +%Y%m%d_%H%M%S).csv"
echo "Exporting detailed results to: $CSV_FILE"
echo "Request,Cloudflare (s),AWS Lambda (s)" > $CSV_FILE
for i in $(seq 0 $((ITERATIONS-1))); do
    echo "$((i+1)),${cf_times[$i]},${aws_times[$i]}" >> $CSV_FILE
done

echo ""
echo -e "${GREEN}✓ Benchmark complete!${NC}"
echo "Results saved to: $CSV_FILE"
