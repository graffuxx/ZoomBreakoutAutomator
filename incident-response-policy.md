# Incident Management And Response Policy

App: Zoom Breakout Automator  
Last updated: September 7, 2026

## Purpose

This policy describes how security or privacy incidents are handled for Zoom Breakout Automator.

## Incident Types

Relevant incidents may include:

- Accidental exposure of credentials.
- A vulnerability in the app code or deployment configuration.
- Unexpected storage or transmission of user data.
- Abuse of the app's Zoom permissions.

## Response Process

1. Triage the report and determine severity.
2. Disable or roll back the affected deployment if needed.
3. Remove exposed credentials and rotate them where applicable.
4. Patch the affected source files.
5. Deploy the fix through Cloudflare.
6. Notify affected users or Zoom Marketplace reviewers when required.
7. Document the root cause and prevention steps.

## Data Breach Considerations

The app does not maintain an external database or backend user store. If an incident affects local user data, users will be advised to remove the app and clear local app/browser storage.

## Contact

Users and reviewers can contact the developer through the support contact listed on the Zoom Marketplace app listing.
