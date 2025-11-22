#!/bin/bash

# Quick benchmark - Simple and fast

ITERATIONS=${1:-50}
CF_URL="https://daad-worker.sathish-257.workers.dev/api/health"
AWS_URL="https://32ia4c6b7eykifeo6qitra5maq0rtkgf.lambda-url.ap-south-1.on.aws/api/health"

echo "Running $ITERATIONS requests to each endpoint..."
echo ""

# Cloudflare Workers
echo "Cloudflare Workers:"
cf_total=0
for i in $(seq 1 $ITERATIONS); do
    time=$(curl -w "%{time_total}" -o /dev/null -s $CF_URL)
    echo "  $i: ${time}s"
    cf_total=$(echo "$cf_total + $time" | bc)
done
cf_avg=$(echo "scale=6; $cf_total / $ITERATIONS" | bc)
echo "Average: ${cf_avg}s"
echo ""

# AWS Lambda
echo "AWS Lambda:"
aws_total=0
for i in $(seq 1 $ITERATIONS); do
    time=$(curl -w "%{time_total}" -o /dev/null -s $AWS_URL)
    echo "  $i: ${time}s"
    aws_total=$(echo "$aws_total + $time" | bc)
done
aws_avg=$(echo "scale=6; $aws_total / $ITERATIONS" | bc)
echo "Average: ${aws_avg}s"
echo ""

# Compare
echo "Summary:"
echo "  Cloudflare: ${cf_avg}s average"
echo "  AWS Lambda: ${aws_avg}s average"
if (( $(echo "$cf_avg < $aws_avg" | bc -l) )); then
    diff=$(echo "scale=2; ($aws_avg - $cf_avg) / $cf_avg * 100" | bc)
    echo "  Winner: Cloudflare (${diff}% faster)"
else
    diff=$(echo "scale=2; ($cf_avg - $aws_avg) / $aws_avg * 100" | bc)
    echo "  Winner: AWS Lambda (${diff}% faster)"
fi
