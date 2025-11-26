#!/bin/bash
# Script to verify broker status in provider and consumer subaccounts

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROVIDER_SUBACCOUNT="95e48ebf-f5e5-4c04-a317-6f0a613054f6"
CONSUMER_SUBACCOUNT="bc4da301-d38a-4038-bd30-dd6c78f3c7dc"

echo -e "${BLUE}=== Broker Status Verification ===${NC}"
echo ""

# Check btp CLI
if ! command -v btp &> /dev/null; then
    echo -e "${RED}Error: btp CLI not found${NC}"
    exit 1
fi

# Check if logged in
if ! btp get accounts/global-account &> /dev/null; then
    echo -e "${RED}Error: Not logged in to btp CLI${NC}"
    echo "Run: btp login"
    exit 1
fi

echo -e "${YELLOW}Provider Subaccount: $PROVIDER_SUBACCOUNT${NC}"
echo -e "${YELLOW}Consumer Subaccount: $CONSUMER_SUBACCOUNT${NC}"
echo ""

# Check provider subaccount
echo -e "${BLUE}=== Provider Subaccount ($PROVIDER_SUBACCOUNT) ===${NC}"
if btp get accounts/subaccount "$PROVIDER_SUBACCOUNT" &> /dev/null; then
    echo -e "${GREEN}✓ Subaccount accessible${NC}"
    PROVIDER_INFO=$(btp get accounts/subaccount "$PROVIDER_SUBACCOUNT" 2>&1)
    echo "$PROVIDER_INFO" | grep -E "display name|region|subdomain" | head -5
    
    echo ""
    echo "Checking brokers..."
    BROKERS=$(btp list services/broker --subaccount "$PROVIDER_SUBACCOUNT" 2>&1)
    if echo "$BROKERS" | grep -qi "authorization failed"; then
        echo -e "${RED}✗ Cannot list brokers (authorization failed)${NC}"
    elif echo "$BROKERS" | grep -qi "grant-management"; then
        echo -e "${GREEN}✓ Broker found in provider subaccount${NC}"
        echo "$BROKERS" | grep -i grant-management
    else
        echo -e "${YELLOW}⚠ No grant-management broker found${NC}"
        echo "$BROKERS" | head -10
    fi
else
    echo -e "${RED}✗ Subaccount not accessible in current global account${NC}"
    echo "Note: Subaccount may be in a different global account"
fi
echo ""

# Check consumer subaccount
echo -e "${BLUE}=== Consumer Subaccount ($CONSUMER_SUBACCOUNT) ===${NC}"
if btp get accounts/subaccount "$CONSUMER_SUBACCOUNT" &> /dev/null; then
    echo -e "${GREEN}✓ Subaccount accessible${NC}"
    CONSUMER_INFO=$(btp get accounts/subaccount "$CONSUMER_SUBACCOUNT" 2>&1)
    echo "$CONSUMER_INFO" | grep -E "display name|region|subdomain" | head -5
    
    echo ""
    echo "Checking brokers..."
    BROKERS=$(btp list services/broker --subaccount "$CONSUMER_SUBACCOUNT" 2>&1)
    if echo "$BROKERS" | grep -qi "authorization failed"; then
        echo -e "${RED}✗ Cannot list brokers (authorization failed)${NC}"
    elif echo "$BROKERS" | grep -qi "grant-management"; then
        echo -e "${GREEN}✓ Broker found in consumer subaccount${NC}"
        echo "$BROKERS" | grep -i grant-management
    else
        echo -e "${RED}✗ No grant-management broker found${NC}"
        echo "This is why the service is not in the marketplace!"
        echo ""
        echo "Brokers in consumer subaccount:"
        echo "$BROKERS" | head -10
    fi
else
    echo -e "${RED}✗ Subaccount not accessible in current global account${NC}"
    echo "Note: Subaccount may be in a different global account"
fi
echo ""

# Summary
echo -e "${BLUE}=== Summary ===${NC}"
echo ""
echo "Issue: Service not visible in consumer marketplace"
echo ""
echo "Root Cause: Broker not registered in consumer subaccount"
echo ""
echo "Solution: Register broker in consumer subaccount:"
echo "  ./artifacts/register-broker-consumer.sh $CONSUMER_SUBACCOUNT grant-management-broker"
echo ""
echo "Note: You may need to:"
echo "  1. Login to the correct global account (btp login)"
echo "  2. Get 'Subaccount Administrator' role in consumer subaccount"
echo "  3. Ensure Service Manager entitlement is assigned"

