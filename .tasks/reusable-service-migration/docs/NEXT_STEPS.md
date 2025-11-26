# Next Steps for Subaccount 57c84747-50e9-4e46-851c-6577c38dfe12

## Current Situation

- **Subaccount ID:** `57c84747-50e9-4e46-851c-6577c38dfe12`
- **Display Name:** Experiments
- **Region:** us10
- **Broker Region:** eu12
- **Status:** Authorization failed (missing permissions)

## What to Do

### Option 1: Get Permissions and Register (Recommended if you want to use this subaccount)

**Step 1: Assign Role Collection**

Via BTP Cockpit:
1. Go to https://cockpit.btp.cloud.sap/
2. Navigate to: **Global Account → Subaccounts → Experiments**
3. Go to: **Security → Role Collections**
4. Find: **Subaccount Administrator**
5. Click **... → Assign Users**
6. Add: `dina.vinter@sap.com`
7. Save

**Step 2: Verify Service Manager Entitlement**

1. In the same subaccount, go to: **Entitlements**
2. Check if **Service Manager** is assigned
3. If not, click **Configure Entitlements** and add it

**Step 3: Register the Broker**

Once permissions are assigned:

```bash
./register-broker-consumer.sh 57c84747-50e9-4e46-851c-6577c38dfe12 grant-management-broker
```

**Note:** This is cross-region (us10 ↔ eu12), which should work but may have latency.

---

### Option 2: Find the Correct Subaccount (Recommended for production)

The broker is in **eu12** region, and your `mcp` org is also in **eu12**. It's better to register in a subaccount in the same region.

**Step 1: Find Subaccount in eu12**

Via BTP Cockpit:
1. Go to https://cockpit.btp.cloud.sap/
2. Navigate to: **Global Account → Subaccounts**
3. Filter by region: **eu12**
4. Find the subaccount that contains the `mcp` org
5. Copy the Subaccount ID

**Step 2: Register in Correct Subaccount**

```bash
./register-broker-consumer.sh <eu12-subaccount-id> grant-management-broker
```

---

### Option 3: Check if You Have Access to Different Global Account

The `mcp` org might be in a different global account. Try:

```bash
# Login to different global account
btp login

# List subaccounts
btp list accounts/subaccount

# Look for subaccount in eu12 region
```

---

## Quick Decision Guide

**Use Subaccount 57c84747-50e9-4e46-851c-6577c38dfe12 if:**
- ✅ You can get permissions assigned
- ✅ This is for testing/development
- ✅ Cross-region is acceptable

**Find Different Subaccount if:**
- ✅ You need production setup
- ✅ You want same-region (eu12) for better performance
- ✅ The `mcp` org is in a different subaccount

---

## Verification Commands

After getting permissions, verify:

```bash
# Check if you can read entitlements
btp list accounts/entitlement --subaccount 57c84747-50e9-4e46-851c-6577c38dfe12

# Check if you can read role collections
btp list security/role-collection --subaccount 57c84747-50e9-4e46-851c-6577c38dfe12

# Run diagnostic
./diagnose-authorization.sh 57c84747-50e9-4e46-851c-6577c38dfe12
```

---

## Recommended Action

**For now:** Get permissions assigned to subaccount `57c84747-50e9-4e46-851c-6577c38dfe12` and test the registration.

**For production:** Find the subaccount in **eu12** region that contains the `mcp` org and register there.

