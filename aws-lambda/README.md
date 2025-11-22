# DAAD AWS Lambda (Rust)

A Rust-based AWS Lambda function for the DAAD project. This implementation allows direct performance comparison with the Cloudflare Worker version.

## Prerequisites

- [Rust](https://rustup.rs/) installed
- [Cargo Lambda](https://www.cargo-lambda.info/) CLI tool
- AWS account with CLI configured
- (Optional) [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

## Installation

### Install Cargo Lambda

```bash
# On macOS/Linux
brew tap cargo-lambda/cargo-lambda
brew install cargo-lambda

# Or via cargo
cargo install cargo-lambda
```

### Configure AWS CLI

```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and default region
```

## Project Structure

```
aws-lambda/
├── src/
│   └── main.rs         # Lambda handler
├── Cargo.toml          # Rust dependencies
├── template.yaml       # AWS SAM template
└── README.md           # This file
```

## Available Endpoints

Identical to the Cloudflare Worker for fair comparison:

- `GET /` - Health check endpoint
- `GET /api/health` - Detailed health status with version info
- `POST /api/diagram` - Endpoint for processing diagram data
- `GET /lambda-version` - Get Lambda version information

## Local Testing

### Method 1: Cargo Lambda (Recommended)

```bash
# Build and run locally
cargo lambda watch

# In another terminal, test the function
cargo lambda invoke --data-ascii '{"httpMethod": "GET", "path": "/"}'

# Or test via local HTTP server
cargo lambda watch --invoke-port 9000

# Then use curl
curl http://localhost:9000/lambda-url/daad-lambda/
curl http://localhost:9000/lambda-url/daad-lambda/api/health
```

### Method 2: AWS SAM

```bash
# Build
sam build

# Start local API
sam local start-api

# Test endpoints
curl http://localhost:3000/
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/diagram -d '{"test": "data"}'
```

## Deployment

### Method 1: Cargo Lambda (Simpler)

```bash
# Build for ARM64 (cheaper, faster cold starts)
cargo lambda build --release --arm64

# Deploy to AWS
cargo lambda deploy \
  --iam-role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role

# Or create the function with automatic role creation
cargo lambda deploy --enable-function-url
```

### Method 2: AWS SAM (More Control)

```bash
# Build
sam build

# Deploy (guided first time)
sam deploy --guided

# Subsequent deploys
sam deploy
```

The guided deployment will ask for:
- Stack name: `daad-lambda-stack`
- AWS Region: your preferred region
- Confirm changes: Y
- Allow SAM CLI IAM role creation: Y
- Save arguments to config: Y

### Get Your Lambda URL

After deployment, the output will show your API Gateway URL:

```bash
# Via SAM
sam list endpoints --stack-name daad-lambda-stack

# Via AWS CLI
aws lambda get-function-url-config --function-name daad-lambda
```

## Performance Testing

### Measure Latency

```bash
# Replace with your actual Lambda URL
LAMBDA_URL="https://your-lambda-id.lambda-url.us-east-1.on.aws"

# Quick latency check
curl -w "TTFB: %{time_starttransfer}s | Total: %{time_total}s\n" \
  -o /dev/null -s $LAMBDA_URL/api/health

# Detailed timing
curl -w "\n\
DNS Lookup:    %{time_namelookup}s\n\
TCP Connect:   %{time_connect}s\n\
TLS Handshake: %{time_appconnect}s\n\
TTFB:          %{time_starttransfer}s\n\
Total Time:    %{time_total}s\n" \
-o /dev/null -s $LAMBDA_URL/api/health
```

### Compare with Cloudflare Worker

```bash
# Test both endpoints
echo "=== AWS Lambda ==="
curl -w "Total: %{time_total}s\n" -o /dev/null -s $LAMBDA_URL/api/health

echo "=== Cloudflare Worker ==="
curl -w "Total: %{time_total}s\n" -o /dev/null -s \
  https://daad-worker.sathish-257.workers.dev/api/health
```

### Run Multiple Tests

```bash
# Test 20 requests to see cold start vs warm performance
echo "Testing AWS Lambda..."
for i in {1..20}; do
  TIME=$(curl -w "%{time_total}" -o /dev/null -s $LAMBDA_URL/api/health)
  echo "Request $i: ${TIME}s"
  sleep 0.5
done
```

## Architecture Comparison

### AWS Lambda (ARM64)
- **Cold Start**: 50-200ms (first request)
- **Warm Requests**: 10-50ms
- **Runtime**: Native Rust on ARM64
- **Scaling**: Automatic (up to account limits)
- **Cost**: Pay per request + duration

### Cloudflare Workers
- **Cold Start**: ~0ms (edge computing)
- **All Requests**: 10-30ms (globally distributed)
- **Runtime**: WebAssembly on V8
- **Scaling**: Unlimited edge locations
- **Cost**: Pay per request

## Optimization Tips

### 1. Use ARM64 Architecture
- 20% better price-performance
- Faster cold starts
- Already configured in `template.yaml`

### 2. Optimize Memory
Test different memory settings to find the sweet spot:

```bash
# Via SAM template.yaml
MemorySize: 256  # Start here, adjust based on performance
```

### 3. Reduce Cold Starts
- Use provisioned concurrency (costs more)
- Keep functions warm with scheduled pings
- Or accept cold starts as trade-off

### 4. Enable Function URLs
For direct HTTPS access without API Gateway:

```bash
cargo lambda deploy --enable-function-url
```

## Monitoring

### View Logs

```bash
# Via SAM
sam logs -n DaadLambdaFunction --tail

# Via AWS CLI
aws logs tail /aws/lambda/daad-lambda --follow
```

### CloudWatch Metrics

```bash
# Get invocation count
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=daad-lambda \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

## Cleanup

```bash
# Via SAM
sam delete --stack-name daad-lambda-stack

# Via Cargo Lambda
cargo lambda delete daad-lambda
```

## Cost Estimation

AWS Lambda Free Tier (monthly):
- 1M free requests
- 400,000 GB-seconds of compute

After free tier (us-east-1, ARM64):
- $0.20 per 1M requests
- $0.0000133334 per GB-second

Example: 1M requests at 100ms with 256MB:
- Request cost: $0.20
- Compute cost: ~$0.34
- **Total: ~$0.54/month**

## Resources

- [AWS Lambda Rust Runtime](https://github.com/awslabs/aws-lambda-rust-runtime)
- [Cargo Lambda Documentation](https://www.cargo-lambda.info/)
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [Lambda Performance Optimization](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
