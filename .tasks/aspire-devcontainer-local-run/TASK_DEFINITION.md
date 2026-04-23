# Aspire + Devcontainer Local Run

**Created**: 2026-04-23
**Last Updated**: 2026-04-23
**Category**: [DEVEX] [INFRA] [LOCAL-RUN]
**Timeline**: 00 of 4 - Task definition and acceptance criteria

## Overview
Add a reproducible local orchestration workflow based on Aspire TypeScript AppHost and align development runtime with the `ghcr.io/cds-zon/dev` devcontainer image.

## Requirements
- Use `ghcr.io/cds-zon/dev` in `.devcontainer/devcontainer.json`.
- Ensure Docker is usable in devcontainer.
- Provide local run flow with CDS + approuter and optional K8s-backed `cds bind`.
- Support KUBECONFIG-driven binding commands (`cds bind ... --on k8s`).
- Document project components, local run, and tests for agents and developers.
- Initialize Aspire TypeScript AppHost and model component dependencies.
- Add custom Aspire commands for bind operations.
- Add CI workflow that uses the devcontainer image and runs `aspire run` checks.

## Acceptance Criteria
- `aspire run` starts orchestrated resources in local-only mode.
- Developers can invoke bind commands (auth/all) from Aspire or scripts.
- Approuter can run in local mode (without IAS dependency) for deterministic CI.
- CI workflow exists and validates `aspire run` startup/shutdown using the devcontainer image.
