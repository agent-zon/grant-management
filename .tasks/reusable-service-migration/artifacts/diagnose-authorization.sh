#!/bin/bash
# Diagnostic script for broker registration authorization issues

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Authorization Diagnostic for Broker Registration ===${NC}"
echo ""

if [ "$#" -lt 1 ]; then
    echo -e "${YELLOW}Usage: $0 <subaccount-id>${NC}"
    echo ""
    echo "Example:"
    echo "  $0 57c84747-50e9-4e46-851c-6577c38dfe12"
    exit 1
fi

SUBACCOUNT_ID=$1

echo "Subaccount ID: $SUBACCOUNT_ID"
echo ""

# Test 1: Check if we can read subaccount
echo -e "${YELLOW}Test 1: Reading subaccount details...${NC}"
if btp get accounts/subaccount "$SUBACCOUNT_ID" &> /dev/null; then
    SUBACCOUNT_INFO=$(btp get accounts/subaccount "$SUBACCOUNT_ID" 2>&1)
    REGION=$(echo "$SUBACCOUNT_INFO" | grep -i "region:" | awk '{print $2}' || echo "unknown")
    DISPLAY_NAME=$(echo "$SUBACCOUNT_INFO" | grep -i "display name:" | awk -F: '{print $2}' | xargs || echo "unknown")
    echo -e "${GREEN}✓ Can read subaccount${NC}"
    echo "  Display Name: $DISPLAY_NAME"
    echo "  Region: $REGION"
else
    echo -e "${RED}✗ Cannot read subaccount${NC}"
    exit 1
fi
echo ""

# Test 2: Check entitlements
echo -e "${YELLOW}Test 2: Checking entitlements...${NC}"
ENTITLEMENTS=$(btp list accounts/entitlement --subaccount "$SUBACCOUNT_ID" 2>&1)
if echo "$ENTITLEMENTS" | grep -qi "authorization failed"; then
    echo -e "${RED}✗ Cannot read entitlements (authorization failed)${NC}"
    echo "  This indicates missing permissions"
else
    echo -e "${GREEN}✓ Can read entitlements${NC}"
    SERVICE_MANAGER=$(echo "$ENTITLEMENTS" | grep -i "service.*manager\|subscription.*manager" || echo "")
    if [ -n "$SERVICE_MANAGER" ]; then
        echo "  Service Manager entitlement found"
    else
        echo -e "${YELLOW}  ⚠ Service Manager entitlement not found${NC}"
    fi
fi
echo ""

# Test 3: Check role collections
echo -e "${YELLOW}Test 3: Checking role collections...${NC}"
ROLES=$(btp list security/role-collection --subaccount "$SUBACCOUNT_ID" 2>&1)
if echo "$ROLES" | grep -qi "authorization failed"; then
    echo -e "${RED}✗ Cannot read role collections (authorization failed)${NC}"
    echo "  This indicates missing permissions"
else
    echo -e "${GREEN}✓ Can read role collections${NC}"
    ADMIN_ROLES=$(echo "$ROLES" | grep -i "admin\|administrator" || echo "")
    if [ -n "$ADMIN_ROLES" ]; then
        echo "  Admin roles found"
    else
        echo -e "${YELLOW}  ⚠ No admin roles found${NC}"
    fi
fi
echo ""

# Summary and recommendations
echo -e "${BLUE}=== Diagnosis Summary ===${NC}"
echo ""

if echo "$ENTITLEMENTS $ROLES" | grep -qi "authorization failed"; then
    echo -e "${RED}Authorization Issue Detected${NC}"
    echo ""
    echo "Required Permissions:"
    echo "  1. Subaccount Administrator role collection"
    echo "     OR"
    echo "  2. Service Manager Administrator role collection"
    echo ""
    echo "How to Fix:"
    echo "  1. Ask a Global Account Administrator to assign you one of:"
    echo "     - 'Subaccount Administrator' role collection"
    echo "     - 'Service Manager Administrator' role collection"
    echo ""
    echo "  2. Or use BTP Cockpit:"
    echo "     - Go to: Subaccount → Security → Role Collections"
    echo "     - Assign 'Subaccount Administrator' to your user"
    echo ""
    echo "  3. Also ensure Service Manager entitlement is assigned:"
    echo "     - Go to: Subaccount → Entitlements"
    echo "     - Ensure 'Service Manager' is assigned"
else
    echo -e "${GREEN}Basic permissions OK${NC}"
    echo ""
    echo "If broker registration still fails, check:"
    echo "  1. Service Manager entitlement is assigned"
    echo "  2. Region compatibility (broker in eu12, subaccount in $REGION)"
fi

echo ""
echo -e "${YELLOW}Note:${NC} Region mismatch (broker in eu12, subaccount in $REGION) may cause issues."
echo "Consider registering in a subaccount in the same region (eu12) as the broker."

