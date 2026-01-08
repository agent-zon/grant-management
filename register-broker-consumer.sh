#!/bin/bash
# Script to register Grant Management Service Broker in a consumer subaccount
# Usage: ./register-broker-consumer.sh <consumer-subaccount-id> [broker-name]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if btp CLI is installed
if ! command -v btp &> /dev/null; then
    echo -e "${RED}Error: btp CLI is not installed${NC}"
    echo "Please install SAP BTP CLI from:"
    echo "https://tools.hana.ondemand.com/#cloud"
    exit 1
fi

# Check arguments
if [ "$#" -lt 1 ]; then
    echo -e "${YELLOW}Usage: $0 <consumer-subaccount-id> [broker-name]${NC}"
    echo ""
    echo "Example:"
    echo "  $0 <subaccount-id> grant-management-broker"
    echo ""
    echo "To find your subaccount ID:"
    echo "  1. Run: btp list accounts/subaccount"
    echo "  2. Or go to BTP Cockpit → Subaccount → Overview"
    echo ""
    echo "Optional: Set broker name (default: grant-management-broker-<subaccount-id>)"
    exit 1
fi

SUBACCOUNT_ID=$1
BROKER_NAME=${2:-"grant-management-broker-${SUBACCOUNT_ID}"}

# Broker configuration (from provider subaccount)
BROKER_URL="https://scai-grants-grant-management-broker.cert.cfapps.eu12.hana.ondemand.com"
BROKER_USERNAME="broker-username"
BROKER_PASSWORD="broker-password"
BROKER_DESCRIPTION="Grant Management OAuth 2.0 Server - Reusable Service"

echo -e "${BLUE}=== Grant Management Service Broker Registration ===${NC}"
echo ""
echo "Consumer Subaccount ID: $SUBACCOUNT_ID"
echo "Broker URL: $BROKER_URL"
echo "Broker Name: $BROKER_NAME"
echo ""

# Step 1: Check btp login
echo -e "${YELLOW}Step 1: Checking btp CLI authentication...${NC}"
if ! btp get accounts/global-account &> /dev/null; then
    echo -e "${RED}Error: Not logged in to btp CLI${NC}"
    echo "Please login first:"
    echo "  btp login"
    exit 1
fi

echo -e "${GREEN}✓ btp CLI authenticated${NC}"
echo ""

# Step 2: Verify subaccount exists
echo -e "${YELLOW}Step 2: Verifying subaccount...${NC}"
if ! btp get accounts/subaccount "$SUBACCOUNT_ID" &> /dev/null; then
    echo -e "${RED}Error: Subaccount '$SUBACCOUNT_ID' not found or not accessible${NC}"
    echo "Available subaccounts:"
    btp list accounts/subaccount 2>&1 | head -10
    exit 1
fi

SUBACCOUNT_INFO=$(btp get accounts/subaccount "$SUBACCOUNT_ID" 2>&1)
SUBACCOUNT_NAME=$(echo "$SUBACCOUNT_INFO" | grep -i "Display Name" | awk -F: '{print $2}' | xargs || echo "N/A")
echo -e "${GREEN}✓ Subaccount verified: $SUBACCOUNT_NAME${NC}"
echo ""

# Step 3: Check if broker already exists
echo -e "${YELLOW}Step 3: Checking for existing broker...${NC}"
EXISTING_BROKER=$(btp list services/broker --subaccount "$SUBACCOUNT_ID" 2>&1 | grep -i "$BROKER_NAME" || echo "")
if [ -n "$EXISTING_BROKER" ]; then
    echo -e "${YELLOW}⚠ Broker '$BROKER_NAME' already exists in this subaccount${NC}"
    echo "Existing broker:"
    echo "$EXISTING_BROKER"
    echo ""
    read -p "Do you want to update it instead? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Updating existing broker...${NC}"
        btp update services/broker "$BROKER_NAME" \
            --subaccount "$SUBACCOUNT_ID" \
            --url "$BROKER_URL" \
            --user "$BROKER_USERNAME" \
            --password "$BROKER_PASSWORD" \
            --use-sm-tls true \
            --description "$BROKER_DESCRIPTION"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Broker updated successfully${NC}"
        else
            echo -e "${RED}✗ Failed to update broker${NC}"
            exit 1
        fi
    else
        echo "Registration cancelled."
        exit 0
    fi
else
    echo -e "${GREEN}✓ No existing broker found, proceeding with registration${NC}"
fi
echo ""

# Step 4: Register the broker
echo -e "${YELLOW}Step 4: Registering service broker...${NC}"
echo "Using recommended secure configuration: Basic Auth + mTLS (Service Manager provided)"
echo ""

btp register services/broker \
    --subaccount "$SUBACCOUNT_ID" \
    --name "$BROKER_NAME" \
    --url "$BROKER_URL" \
    --user "$BROKER_USERNAME" \
    --password "$BROKER_PASSWORD" \
    --use-sm-tls true \
    --description "$BROKER_DESCRIPTION"

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to register broker${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Broker registered successfully${NC}"
echo ""

# Step 5: Verify registration
echo -e "${YELLOW}Step 5: Verifying broker registration...${NC}"
sleep 2  # Give it a moment to appear
REGISTERED_BROKER=$(btp list services/broker --subaccount "$SUBACCOUNT_ID" 2>&1 | grep -i "$BROKER_NAME" || echo "")
if [ -n "$REGISTERED_BROKER" ]; then
    echo -e "${GREEN}✓ Broker found in subaccount${NC}"
    echo "$REGISTERED_BROKER"
else
    echo -e "${YELLOW}⚠ Broker not yet visible (may take a moment)${NC}"
fi
echo ""

echo -e "${BLUE}=== Registration Complete ===${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo ""
echo "1. Switch to consumer subaccount in Cloud Foundry:"
echo "   cf target -o <consumer-org> -s <consumer-space>"
echo ""
echo "2. Verify service in marketplace:"
echo "   cf marketplace | grep grant-management"
echo ""
echo "3. Create a service instance:"
echo "   cf create-service grant-management-service standard <instance-name>"
echo ""
echo "4. Verify broker registration:"
echo "   btp list services/broker --subaccount $SUBACCOUNT_ID"
echo ""

