# Security Policy

## Supported Versions

Hermes Panel is currently pre-1.0. Security fixes target the latest `main`
branch unless a release branch is explicitly announced.

## Reporting A Vulnerability

Please do not open public issues for vulnerabilities involving credentials,
local secret storage, command execution, or cross-origin access.

Report security concerns privately to the project maintainers. Include:

- A short description of the issue.
- Reproduction steps or a proof of concept.
- Affected platform and version.
- Whether Hermes API keys, local files, or command execution are involved.

## Security Boundaries

- The frontend must not receive Hermes API keys.
- The BFF is the only component that proxies Hermes API traffic.
- `~/.hermes/state.db` is read-only from the panel BFF.
- Browser access is protected by `X-Panel-Token`.
- Packaged desktop builds should keep native permissions and CSP as narrow as
  practical for the feature set.

