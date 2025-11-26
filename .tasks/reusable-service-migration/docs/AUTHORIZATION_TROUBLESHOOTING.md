# Authorization Troubleshooting for Broker Registration

## Problem

When running `./register-broker-consumer.sh`, you get:
```
Authorization failed
ERROR
```

## Root Causes

### 1. Missing Role Collections

You need one of these role collections assigned to your user in the target subaccount:

- **Subaccount Administrator** (recommended)
- **Service Manager Administrator**

### 2. Missing Service Manager Entitlement

The subaccount must have the **Service Manager** entitlement assigned.

### 3. Region Mismatch

- Broker is deployed in: **eu12** region
- Subaccount is in: **us10** region (or different region)

While cross-region registration might work, it's recommended to register in the same region.

## Solutions

### Solution 1: Assign Role Collection (Recommended)

**Via BTP Cockpit:**
1. Go to https://cockpit.btp.cloud.sap/
2. Navigate to: **Global Account → Subaccounts → [Your Subaccount]**
3. Go to: **Security → Role Collections**
4. Find: **Subaccount Administrator**
5. Click **... → Assign Users**
6. Add your user (dina.vinter@sap.com)
7. Save

**Via btp CLI (if you have Global Account Admin):**
```bash
btp assign security/role-collection \
  "Subaccount Administrator" \
  --to-user dina.vinter@sap.com \
  --subaccount <subaccount-id>
```

### Solution 2: Assign Service Manager Entitlement

**Via BTP Cockpit:**
1. Go to: **Global Account → Subaccounts → [Your Subaccount]**
2. Go to: **Entitlements**
3. Click **Configure Entitlements**
4. Add **Service Manager** entitlement
5. Save

**Via btp CLI (if you have Global Account Admin):**
```bash
btp assign accounts/entitlement \
  --for-service service-manager \
  --plan container \
  --to-subaccount <subaccount-id>
```

### Solution 3: Use Correct Subaccount (Region Match)

Find the subaccount in the **eu12** region (same as broker):

1. **Via BTP Cockpit:**
   - Go to: **Global Account → Subaccounts**
   - Filter by region: **eu12**
   - Find the subaccount for your `mcp` org
   - Copy the Subaccount ID

2. **Via btp CLI:**
   ```bash
   # Login to correct global account
   btp login
   
   # List subaccounts
   btp list accounts/subaccount
   # Look for subaccount in eu12 region
   ```

## Diagnostic Tools

### Run Diagnostic Script

```bash
./diagnose-authorization.sh <subaccount-id>
```

This will check:
- ✅ Can read subaccount details
- ✅ Can read entitlements
- ✅ Can read role collections
- ✅ Service Manager entitlement present
- ✅ Admin roles assigned

### Manual Checks

**Check your role collections:**
```bash
btp list security/role-collection --subaccount <subaccount-id>
```

**Check entitlements:**
```bash
btp list accounts/entitlement --subaccount <subaccount-id>
```

**Check subaccount region:**
```bash
btp get accounts/subaccount <subaccount-id> | grep -i region
```

## Quick Fix Checklist

- [ ] **Subaccount Administrator** role collection assigned to your user
- [ ] **Service Manager** entitlement assigned to subaccount
- [ ] Subaccount is in **eu12** region (same as broker)
- [ ] You're logged into the correct global account
- [ ] Subaccount ID is correct

## Alternative: Use Global Account Admin

If you have **Global Account Administrator** permissions, you can:

1. Register the broker at the **global account level** (makes it available to all subaccounts)
2. Or assign yourself the necessary permissions

## Next Steps

Once permissions are fixed:

```bash
./register-broker-consumer.sh <subaccount-id> grant-management-broker
```

## Still Having Issues?

1. **Check BTP Cockpit** for your exact role assignments
2. **Contact Global Account Administrator** to assign permissions
3. **Verify Service Manager entitlement** is assigned
4. **Consider using subaccount in eu12 region** (same as broker)

