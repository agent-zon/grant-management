#!/bin/bash
# Test script to validate broker registration prerequisites
# This tests everything we can without smctl installation

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Grant Management Service Broker - Registration Test ===${NC}"
echo ""

# Test 1: Broker URL accessibility
echo -e "${YELLOW}Test 1: Checking broker accessibility...${NC}"
BROKER_URL="https://scai-grants-grant-management-broker.cert.cfapps.eu12.hana.ondemand.com"
HEALTH_STATUS=$(curl -k -s -o /dev/null -w "%{http_code}" "$BROKER_URL/health" 2>/dev/null || echo "000")

if [ "$HEALTH_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Broker is accessible (HTTP $HEALTH_STATUS)${NC}"
    HEALTH_RESPONSE=$(curl -k -s "$BROKER_URL/health")
    echo "  Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}✗ Broker is not accessible (HTTP $HEALTH_STATUS)${NC}"
    exit 1
fi
echo ""

# Test 2: Broker catalog endpoint
echo -e "${YELLOW}Test 2: Checking broker catalog...${NC}"
CATALOG_RESPONSE=$(curl -k -s "$BROKER_URL/v2/catalog")
SERVICE_NAME=$(echo "$CATALOG_RESPONSE" | jq -r '.services[0].name // "not found"' 2>/dev/null || echo "not found")
PLAN_NAME=$(echo "$CATALOG_RESPONSE" | jq -r '.services[0].plans[0].name // "not found"' 2>/dev/null || echo "not found")

if [ "$SERVICE_NAME" = "grant-management-service" ] && [ "$PLAN_NAME" = "standard" ]; then
    echo -e "${GREEN}✓ Catalog endpoint working correctly${NC}"
    echo "  Service: $SERVICE_NAME"
    echo "  Plan: $PLAN_NAME"
else
    echo -e "${RED}✗ Catalog endpoint issue${NC}"
    echo "  Service: $SERVICE_NAME"
    echo "  Plan: $PLAN_NAME"
    exit 1
fi
echo ""

# Test 3: Check btp CLI installation
echo -e "${YELLOW}Test 3: Checking btp CLI installation...${NC}"
if command -v btp &> /dev/null; then
    BTP_VERSION=$(btp --version 2>/dev/null | head -1 || echo "installed")
    echo -e "${GREEN}✓ btp CLI is installed${NC}"
    echo "  $BTP_VERSION"
    
    # Check if logged in
    if btp get accounts/global-account &> /dev/null; then
        echo -e "${GREEN}  ✓ Authenticated to SAP BTP${NC}"
    else
        echo -e "${YELLOW}  ⚠ Not logged in (run: btp login)${NC}"
    fi
else
    echo -e "${RED}✗ btp CLI is not installed${NC}"
    echo "  This is required for broker registration"
    echo "  Install from: https://tools.hana.ondemand.com/#cloud"
    echo ""
    echo "  Note: smctl is deprecated. Use btp CLI instead."
fi
echo ""

# Test 4: Check broker credentials in mta.yaml
echo -e "${YELLOW}Test 4: Checking broker credentials configuration...${NC}"
if [ -f "mta.yaml" ]; then
    BROKER_USER=$(grep -A 2 "broker-credentials:" mta.yaml | grep "user:" | awk '{print $2}' | tr -d '"' || echo "not found")
    BROKER_PASS=$(grep -A 2 "broker-credentials:" mta.yaml | grep "password:" | awk '{print $2}' | tr -d '"' || echo "not found")
    
    if [ "$BROKER_USER" != "not found" ] && [ "$BROKER_PASS" != "not found" ]; then
        echo -e "${GREEN}✓ Broker credentials found in mta.yaml${NC}"
        echo "  Username: $BROKER_USER"
        echo "  Password: [configured]"
    else
        echo -e "${YELLOW}⚠ Broker credentials not found in mta.yaml${NC}"
    fi
else
    echo -e "${RED}✗ mta.yaml not found${NC}"
fi
echo ""

# Test 5: Check current CF target
echo -e "${YELLOW}Test 5: Checking Cloud Foundry target...${NC}"
if command -v cf &> /dev/null; then
    CF_ORG=$(cf target 2>/dev/null | grep "org:" | awk '{print $2}' || echo "unknown")
    CF_SPACE=$(cf target 2>/dev/null | grep "space:" | awk '{print $2}' || echo "unknown")
    echo -e "${GREEN}✓ Cloud Foundry CLI available${NC}"
    echo "  Current org: $CF_ORG"
    echo "  Current space: $CF_SPACE"
else
    echo -e "${YELLOW}⚠ Cloud Foundry CLI not found${NC}"
fi
echo ""

# Test 6: Verify broker is registered in provider space
echo -e "${YELLOW}Test 6: Checking broker registration in provider space...${NC}"
if command -v cf &> /dev/null; then
    BROKER_REGISTERED=$(cf service-brokers 2>/dev/null | grep -i "grant-management" || echo "")
    if [ -n "$BROKER_REGISTERED" ]; then
        echo -e "${GREEN}✓ Broker is registered in current space${NC}"
        echo "$BROKER_REGISTERED"
    else
        echo -e "${YELLOW}⚠ Broker not found in current space${NC}"
        echo "  (This is expected if you're in a consumer space)"
    fi
else
    echo -e "${YELLOW}⚠ Cannot check broker registration (cf CLI not available)${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}=== Test Summary ===${NC}"
echo ""
if [ "$HEALTH_STATUS" = "200" ] && [ "$SERVICE_NAME" = "grant-management-service" ]; then
    echo -e "${GREEN}✓ Broker is healthy and ready for registration${NC}"
    echo ""
    if ! command -v btp &> /dev/null; then
        echo -e "${YELLOW}Next Steps:${NC}"
        echo "1. Install btp CLI from: https://tools.hana.ondemand.com/#cloud"
        echo "2. Login: btp login"
        echo "3. Get subaccount ID: btp list accounts/subaccount"
        echo "4. Run: ./register-broker-consumer.sh <subaccount-id>"
        echo ""
        echo "Example:"
        echo "  ./register-broker-consumer.sh <subaccount-id> grant-management-broker"
    else
        echo -e "${GREEN}Ready to register!${NC}"
        echo ""
        echo "1. Get subaccount ID:"
        echo "   btp list accounts/subaccount"
        echo ""
        echo "2. Run registration:"
        echo "   ./register-broker-consumer.sh <subaccount-id>"
        echo ""
        echo "Example:"
        echo "   ./register-broker-consumer.sh <subaccount-id> grant-management-broker"
    fi
else
    echo -e "${RED}✗ Broker validation failed${NC}"
    exit 1
fi
echo ""

