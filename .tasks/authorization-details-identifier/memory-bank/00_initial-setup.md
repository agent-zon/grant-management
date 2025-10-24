# Initial Setup

**Created**: 2025-10-24  
**Last Updated**: 2025-10-24  
**Category**: [REPOSITORY KNOWLEDGE]  
**Timeline**: 00 of N - Baseline

## Overview
- Existing model had `AuthorizationDetail` composed under `Consents` and indirectly under `Grants`.
- Requirement: switch to grant-centric details with stable business `identifier`, dedupe via `(grant, identifier)`.
