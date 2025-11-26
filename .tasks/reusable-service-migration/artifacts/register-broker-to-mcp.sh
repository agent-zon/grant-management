#!/bin/bash
# Quick script to register broker in MCP consumer subaccount
# Usage: ./register-broker-to-mcp.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROVIDER_SUBACCOUNT="95e48ebf-f5e5-4c04-a317-6f0a613054f6"
CONSUMER_SUBACCOUNT="bc4da301-d38a-4038-bd30-dd6c78f3c7dc"
BROKER_NAME="grant-management-broker"

echo -e "${BLUE}=== Register Grant Management Broker to MCP Subaccount ===${NC}"
echo ""
echo "Provider: $PROVIDER_SUBACCOUNT (scai/grants)"
echo "Consumer: $CONSUMER_SUBACCOUNT (mcp)"
echo ""

# Check btp CLI
if ! command -v btp &> /dev/null; then
    echo -e "${RED}Error: btp CLI not found${NC}"
    exit 1
fi

# Check if logged in
if ! btp get accounts/global-account &> /dev/null; then
    echo -e "${RED}Error: Not logged in to btp CLI${NC}"
    echo "Please login first:"
    echo "  btp login"
    exit 1
fi

CURRENT_GA=$(btp get accounts/global-account 2>&1 | grep "global account id" | awk '{print $NF}')
echo "Current Global Account: $CURRENT_GA"
echo ""

# Verify subaccounts are accessible
echo -e "${YELLOW}Step 1: Verifying subaccount access...${NC}"
if ! btp get accounts/subaccount "$CONSUMER_SUBACCOUNT" &> /dev/null; then
    echo -e "${RED}Error: Cannot access consumer subaccount${NC}"
    echo ""
    echo "The subaccount may be in a different global account."
    echo "Please:"
    echo "  1. Run: btp login"
    echo "  2. Select the global account containing subaccount $CONSUMER_SUBACCOUNT"
    echo "  3. Run this script again"
    exit 1
fi

CONSUMER_INFO=$(btp get accounts/subaccount "$CONSUMER_SUBACCOUNT" 2>&1)
CONSUMER_NAME=$(echo "$CONSUMER_INFO" | grep -i "display name" | awk -F: '{print $2}' | xargs || echo "N/A")
echo -e "${GREEN}✓ Consumer subaccount accessible: $CONSUMER_NAME${NC}"
echo ""

# Check if broker already exists
echo -e "${YELLOW}Step 2: Checking for existing broker...${NC}"
EXISTING=$(btp list services/broker --subaccount "$CONSUMER_SUBACCOUNT" 2>&1 | grep -i "$BROKER_NAME" || echo "")
if [ -n "$EXISTING" ]; then
    echo -e "${YELLOW}⚠ Broker '$BROKER_NAME' already exists${NC}"
    echo "$EXISTING"
    echo ""
    read -p "Do you want to update it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Updating broker..."
        btp update services/broker "$BROKER_NAME" \
            --subaccount "$CONSUMER_SUBACCOUNT" \
            --url "https://scai-grants-grant-management-broker.cert.cfapps.eu12.hana.ondemand.com" \
            --user "broker-username" \
            --password "broker-password" \
            --use-sm-tls true \
            --description "Grant Management OAuth 2.0 Server - Reusable Service"
        echo -e "${GREEN}✓ Broker updated${NC}"
        exit 0
    else
        echo "Skipping registration."
        exit 0
    fi
else
    echo -e "${GREEN}✓ No existing broker found${NC}"
fi
echo ""

# Register broker
echo -e "${YELLOW}Step 3: Registering broker...${NC}"
btp register services/broker \
    --subaccount "$CONSUMER_SUBACCOUNT" \
    --name "$BROKER_NAME" \
    --url "https://scai-grants-grant-management-broker.cert.cfapps.eu12.hana.ondemand.com" \
    --user "broker-username" \
    --password "broker-password" \
    --use-sm-tls true \
    --description "Grant Management OAuth 2.0 Server - Reusable Service"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Broker registered successfully${NC}"
else
    echo -e "${RED}✗ Broker registration failed${NC}"
    exit 1
fi
echo ""

# Verify registration
echo -e "${YELLOW}Step 4: Verifying registration...${NC}"
sleep 2
REGISTERED=$(btp list services/broker --subaccount "$CONSUMER_SUBACCOUNT" 2>&1 | grep -i "$BROKER_NAME" || echo "")
if [ -n "$REGISTERED" ]; then
    echo -e "${GREEN}✓ Broker found in consumer subaccount${NC}"
    echo "$REGISTERED"
else
    echo -e "${YELLOW}⚠ Broker not yet visible (may take a moment)${NC}"
fi
echo ""

echo -e "${BLUE}=== Registration Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Verify service in marketplace:"
echo "   cf target -o mcp -s dev"
echo "   cf marketplace | grep grant-management"
echo ""
echo "2. Create service instance:"
echo "   cf create-service grant-management-service standard test-instance"
echo ""

