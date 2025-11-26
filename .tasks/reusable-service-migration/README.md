# Reusable Service Migration Task

**Task**: Reusable Service Migration & Cross-Org Broker Setup  
**Status**: IN_PROGRESS  
**Created**: 2025-01-27

## Quick Links

- [Task Definition](./TASK_DEFINITION.md) - Goals, requirements, acceptance criteria
- [Status](./STATUS.md) - Current progress and blockers
- [Changelog](./CHANGELOG.md) - Chronological changes
- [Notes](./NOTES.md) - Key learnings and references

## Documentation

All documentation is organized in the `docs/` folder:

- [REUSABLE_SERVICE_MIGRATION.md](./docs/REUSABLE_SERVICE_MIGRATION.md) - Migration guide
- [BROKER_CROSS_ORG_SETUP.md](./docs/BROKER_CROSS_ORG_SETUP.md) - Setup guide
- [BROKER_REGISTRATION_MIGRATION.md](./docs/BROKER_REGISTRATION_MIGRATION.md) - smctl → btp CLI migration
- [BROKER_TEST_RESULTS.md](./docs/BROKER_TEST_RESULTS.md) - Test results
- [AUTHORIZATION_TROUBLESHOOTING.md](./docs/AUTHORIZATION_TROUBLESHOOTING.md) - Troubleshooting guide
- [NEXT_STEPS.md](./docs/NEXT_STEPS.md) - Action items

## Scripts

All scripts are in the `artifacts/` folder:

- `register-broker-consumer.sh` - Register broker in consumer subaccount
- `test-broker-registration.sh` - Validate prerequisites
- `diagnose-authorization.sh` - Diagnose authorization issues
- `find-subaccount-id.sh` - Find subaccount IDs

## Memory Bank

Timeline-ordered knowledge in `memory-bank/`:

- `00_initial-migration-planning.md` - Planning phase
- `01_broker-implementation.md` - Broker implementation
- `02_mta-configuration-updates.md` - MTA configuration
- `03_cross-org-registration.md` - Cross-org registration
- `04_testing-validation.md` - Testing results
- `05_documentation-organization.md` - Documentation organization

## Quick Start

1. **Read the migration guide**: [REUSABLE_SERVICE_MIGRATION.md](./docs/REUSABLE_SERVICE_MIGRATION.md)
2. **Set up broker registration**: [BROKER_CROSS_ORG_SETUP.md](./docs/BROKER_CROSS_ORG_SETUP.md)
3. **Run registration script**: `./artifacts/register-broker-consumer.sh <subaccount-id>`

## Current Status

✅ Broker implemented and deployed  
✅ Documentation created  
✅ Scripts created and tested  
⚠️ Cross-org registration pending (authorization issues)

See [STATUS.md](./STATUS.md) for details.

