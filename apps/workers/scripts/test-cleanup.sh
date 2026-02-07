#!/bin/bash

# Test script for the scheduled cleanup worker
# This script helps test the cleanup worker locally and in production

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== DAD Cleanup Worker Test Script ===${NC}\n"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}Error: wrangler CLI not found${NC}"
    echo "Install it with: npm install -g wrangler"
    exit 1
fi

# Parse arguments
MODE=${1:-dry-run}

case $MODE in
    dry-run)
        echo -e "${GREEN}Running in DRY-RUN mode (no deletions will occur)${NC}\n"
        export DRY_RUN="true"
        ;;
    live)
        echo -e "${RED}WARNING: Running in LIVE mode (actual deletions will occur)${NC}"
        read -p "Are you sure? (type 'yes' to continue): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "Aborted."
            exit 0
        fi
        export DRY_RUN="false"
        ;;
    *)
        echo -e "${RED}Usage: $0 [dry-run|live]${NC}"
        echo "  dry-run: Test without deleting (default)"
        echo "  live: Perform actual deletions"
        exit 1
        ;;
esac

echo -e "${YELLOW}Starting cleanup worker test...${NC}\n"

# Trigger the scheduled worker locally
# Note: This requires wrangler dev to support --test-scheduled
wrangler dev --test-scheduled --var DRY_RUN:"$DRY_RUN"

echo -e "\n${GREEN}Test complete!${NC}"
echo -e "\nTo test in production:"
echo -e "  ${YELLOW}wrangler deploy${NC}"
echo -e "  ${YELLOW}wrangler tail${NC}  # Monitor logs"
echo -e "  ${YELLOW}# Wait for cron or trigger manually via dashboard${NC}"
