#!/bin/bash
# Helper script to find subaccount ID for a Cloud Foundry org

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Finding Subaccount ID for Cloud Foundry Org ===${NC}"
echo ""

# Get current CF org
if ! command -v cf &> /dev/null; then
    echo -e "${YELLOW}Cloud Foundry CLI not found${NC}"
    exit 1
fi

CURRENT_ORG=$(cf target 2>&1 | grep "org:" | awk '{print $2}' || echo "")
CURRENT_SPACE=$(cf target 2>&1 | grep "space:" | awk '{print $2}' || echo "")
ORG_GUID=$(cf org "$CURRENT_ORG" --guid 2>&1 | tail -1 || echo "")

echo "Current Cloud Foundry Target:"
echo "  Org: $CURRENT_ORG"
echo "  Space: $CURRENT_SPACE"
echo "  Org GUID: $ORG_GUID"
echo ""

# Check if org GUID matches a subaccount
if [ -n "$ORG_GUID" ] && command -v btp &> /dev/null; then
    echo -e "${YELLOW}Checking if org GUID matches a subaccount...${NC}"
    if btp get accounts/subaccount "$ORG_GUID" &> /dev/null; then
        echo -e "${GREEN}✓ Found subaccount!${NC}"
        btp get accounts/subaccount "$ORG_GUID" 2>&1 | grep -E "subaccount id|display name|region|subdomain"
        echo ""
        echo -e "${GREEN}Subaccount ID: $ORG_GUID${NC}"
        exit 0
    else
        echo -e "${YELLOW}Org GUID does not match a subaccount in current global account${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}=== How to Find Subaccount ID ===${NC}"
echo ""
echo "Method 1: BTP Cockpit (Recommended)"
echo "  1. Go to https://cockpit.btp.cloud.sap/"
echo "  2. Navigate to: Global Account → Subaccounts"
echo "  3. Find the subaccount for org '$CURRENT_ORG'"
echo "  4. Click on the subaccount → Overview"
echo "  5. Copy the 'Subaccount ID'"
echo ""

echo "Method 2: Check Different Global Account"
echo "  The '$CURRENT_ORG' org might be in a different global account."
echo "  Try logging in to a different global account:"
echo "    btp login"
echo "  Then list subaccounts:"
echo "    btp list accounts/subaccount"
echo ""

echo "Method 3: Use CF Org Metadata"
echo "  Sometimes the subaccount ID is stored in org metadata:"
echo "    cf curl /v2/organizations/$ORG_GUID | jq ."
echo ""

if [ -n "$ORG_GUID" ]; then
    echo -e "${BLUE}Current Org GUID: $ORG_GUID${NC}"
    echo "You can try this as a subaccount ID, but it's likely in a different global account."
fi

echo ""
echo "Once you have the subaccount ID, run:"
echo "  ./register-broker-consumer.sh <subaccount-id>"

