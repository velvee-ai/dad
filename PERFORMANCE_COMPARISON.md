# Performance Comparison: Cloudflare Workers vs AWS Lambda

This document provides a comprehensive comparison between the Cloudflare Workers (Rust/WASM) and AWS Lambda (Rust/Native) implementations of the DAAD API.

## Test Setup

Both implementations use:
- **Language**: Rust
- **Optimization**: Release builds with LTO and size optimization
- **Endpoints**: Identical API surface for fair comparison

### Cloudflare Workers
- **Runtime**: WebAssembly on V8 isolates
- **Build**: `wasm32-unknown-unknown` target
- **URL**: `https://daad-worker.sathish-257.workers.dev`

### AWS Lambda
- **Runtime**: Native ARM64 binary
- **Architecture**: `provided.al2023` with ARM64
- **URL**: Your deployed Lambda URL

## Quick Comparison Test

### Setup Test Script

Create `test-both.sh`:

```bash
#!/bin/bash

# Cloudflare Worker URL
CF_URL="https://daad-worker.sathish-257.workers.dev/api/health"

# AWS Lambda URL (replace with your actual URL)
AWS_URL="https://your-lambda-id.lambda-url.us-east-1.on.aws/api/health"

echo "================================"
echo "Performance Comparison Test"
echo "================================"
echo ""

# Test Cloudflare Workers
echo "Testing Cloudflare Workers..."
echo "URL: $CF_URL"
CF_TIMES=()
for i in {1..10}; do
  TIME=$(curl -w "%{time_total}" -o /dev/null -s $CF_URL)
  CF_TIMES+=($TIME)
  echo "  Request $i: ${TIME}s"
done
echo ""

# Test AWS Lambda
echo "Testing AWS Lambda..."
echo "URL: $AWS_URL"
AWS_TIMES=()
for i in {1..10}; do
  TIME=$(curl -w "%{time_total}" -o /dev/null -s $AWS_URL)
  AWS_TIMES+=($TIME)
  echo "  Request $i: ${TIME}s"
done
echo ""

# Calculate averages
echo "================================"
echo "Summary"
echo "================================"
echo ""

# Cloudflare average
CF_AVG=$(echo "${CF_TIMES[@]}" | tr ' ' '\n' | awk '{sum+=$1} END {printf "%.3f", sum/NR}')
echo "Cloudflare Workers Average: ${CF_AVG}s"

# AWS average
AWS_AVG=$(echo "${AWS_TIMES[@]}" | tr ' ' '\n' | awk '{sum+=$1} END {printf "%.3f", sum/NR}')
echo "AWS Lambda Average: ${AWS_AVG}s"

# Compare
echo ""
if (( $(echo "$CF_AVG < $AWS_AVG" | bc -l) )); then
  DIFF=$(echo "scale=3; ($AWS_AVG - $CF_AVG) / $CF_AVG * 100" | bc)
  echo "Winner: Cloudflare Workers (${DIFF}% faster)"
else
  DIFF=$(echo "scale=3; ($CF_AVG - $AWS_AVG) / $AWS_AVG * 100" | bc)
  echo "Winner: AWS Lambda (${DIFF}% faster)"
fi
```

Run:
```bash
chmod +x test-both.sh
./test-both.sh
```

## Detailed Performance Testing

### 1. Cold Start Test

```bash
# AWS Lambda - First request after idle (cold start)
aws lambda invoke \
  --function-name daad-lambda \
  --payload '{}' \
  response.json \
  --log-type Tail \
  --query 'LogResult' \
  --output text | base64 -d

# Look for "Init Duration" in logs
```

**Note**: Cloudflare Workers don't have traditional cold starts due to V8 isolates.

### 2. Latency from Different Regions

Test from various AWS regions to see edge vs regional performance:

```bash
# Test from different locations using online tools or EC2 instances
# Cloudflare: Should be consistently fast globally (edge locations)
# AWS Lambda: Faster near deployed region, slower farther away
```

### 3. Throughput Test

```bash
# Install Apache Bench
sudo apt-get install apache2-utils  # or brew install ab

# Cloudflare Workers
ab -n 1000 -c 10 https://daad-worker.sathish-257.workers.dev/api/health

# AWS Lambda
ab -n 1000 -c 10 https://your-lambda-url/api/health
```

### 4. Payload Size Test

```bash
# Small payload (1KB)
curl -X POST $URL/api/diagram \
  -d '{"nodes":[{"id":"1"}]}' \
  -w "Time: %{time_total}s\n" -o /dev/null -s

# Large payload (100KB)
curl -X POST $URL/api/diagram \
  -d "@large-payload.json" \
  -w "Time: %{time_total}s\n" -o /dev/null -s
```

## Expected Results

### Typical Performance Metrics

| Metric | Cloudflare Workers | AWS Lambda (ARM64) | Winner |
|--------|-------------------|-------------------|---------|
| **Cold Start** | ~0ms (no cold start) | 50-200ms | Cloudflare |
| **Warm Request** | 10-30ms | 10-50ms | Tie/Cloudflare |
| **Global Edge** | <50ms worldwide | Depends on region | Cloudflare |
| **Regional** | 10-30ms | 10-30ms | Tie |
| **Throughput** | Very high | High | Cloudflare |
| **Max Duration** | 30s (free), 15m (paid) | 15 minutes | AWS Lambda |

### Cost Comparison (per 1M requests)

| Service | Free Tier | After Free Tier |
|---------|-----------|-----------------|
| **Cloudflare Workers** | 100K requests/day | $0.50 per million |
| **AWS Lambda** | 1M requests/month | ~$0.54 per million |

**Note**: Costs vary based on:
- Request duration
- Memory allocation (AWS)
- Bandwidth usage
- Additional features (KV storage, etc.)

## Performance Characteristics

### Cloudflare Workers Advantages
✅ No cold starts (V8 isolates)
✅ Global edge network (300+ cities)
✅ Consistent low latency worldwide
✅ Better for high-frequency, short-duration tasks
✅ Free tier includes 100K requests/day

### AWS Lambda Advantages
✅ Native performance (not WASM)
✅ Longer execution time (15 minutes vs 30 seconds)
✅ More memory options (128MB - 10GB)
✅ Better for CPU-intensive tasks
✅ Rich AWS ecosystem integration

## Real-World Test Results

Document your actual test results here:

```
Date:
Test Location:
Test Tool: curl

Cloudflare Workers:
- Average: _____ms
- Min: _____ms
- Max: _____ms
- P95: _____ms

AWS Lambda:
- Average: _____ms
- Min: _____ms
- Max: _____ms
- P95: _____ms

Winner: _____________
Notes:
```

## Recommendations

### Use Cloudflare Workers when:
- You need consistent global performance
- Cold starts are unacceptable
- Tasks complete in < 30 seconds
- You want simple, fast deployments
- Budget is a primary concern

### Use AWS Lambda when:
- You need longer execution times
- Tasks are CPU-intensive
- You need deep AWS integration
- You want maximum memory/CPU
- Regional performance is sufficient

## Advanced Testing

### Load Testing with wrk

```bash
# Install wrk
git clone https://github.com/wg/wrk.git
cd wrk && make

# Test Cloudflare
./wrk -t12 -c400 -d30s https://daad-worker.sathish-257.workers.dev/api/health

# Test AWS Lambda
./wrk -t12 -c400 -d30s https://your-lambda-url/api/health
```

### Custom Benchmarking Script

Create `benchmark.sh`:

```bash
#!/bin/bash

ITERATIONS=100
URL=$1

echo "Running $ITERATIONS requests to $URL"

declare -a times

for i in $(seq 1 $ITERATIONS); do
  time=$(curl -w "%{time_total}" -o /dev/null -s $URL)
  times+=($time)

  if (( $i % 10 == 0 )); then
    echo "Progress: $i/$ITERATIONS"
  fi
done

# Calculate statistics
sorted=($(printf '%s\n' "${times[@]}" | sort -n))
count=${#sorted[@]}
min=${sorted[0]}
max=${sorted[$count-1]}
p50=${sorted[$((count/2))]}
p95=${sorted[$((count*95/100))]}
p99=${sorted[$((count*99/100))]}

avg=$(printf '%s\n' "${times[@]}" | awk '{sum+=$1} END {print sum/NR}')

echo ""
echo "Results for $URL:"
echo "  Min:     $min s"
echo "  Average: $avg s"
echo "  Median:  $p50 s"
echo "  P95:     $p95 s"
echo "  P99:     $p99 s"
echo "  Max:     $max s"
```

Usage:
```bash
chmod +x benchmark.sh
./benchmark.sh https://daad-worker.sathish-257.workers.dev/api/health
./benchmark.sh https://your-lambda-url/api/health
```

## Monitoring & Observability

### Cloudflare
- Real-time analytics in dashboard
- Free tier includes basic metrics
- Workers Analytics API available

### AWS Lambda
- CloudWatch metrics (free with Lambda)
- X-Ray tracing (additional cost)
- Custom metrics via CloudWatch

## Conclusion

Both platforms excel in different scenarios:

- **Cloudflare Workers**: Best for edge computing, global distribution, and avoiding cold starts
- **AWS Lambda**: Best for longer tasks, AWS integration, and flexible compute resources

For the DAAD use case (diagram API), **Cloudflare Workers** likely provides better overall performance due to edge distribution and no cold starts, unless you need features specific to AWS Lambda.
