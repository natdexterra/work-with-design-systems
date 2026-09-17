# Security

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for this repository (Security tab → "Report a vulnerability"). Do not open a public issue for a security problem. Expect an acknowledgement within seven days.

## Scope

The skill's scripts run inside the user's own Figma session through the Figma MCP server, with that user's access and nothing more. There is no hosted service, no credential store, and no network call made by the scripts themselves. Reports that matter most: a script that writes to a file when it is documented as read-only, an instruction in the skill that would make an agent exfiltrate file content, and any dependency or workflow change that introduces a fetch or a token.

## Supported versions

The latest minor release receives fixes. Older releases are not patched; upgrade to the current version.
