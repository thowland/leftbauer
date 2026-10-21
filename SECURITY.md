# Security

Left Bauer is a static web app with no server and no accounts, and nothing the game stores leaves the device. That leaves three likely places for a security problem: the hosting configuration (S3 and CloudFront, in `infra/`), the Content-Security-Policy and other response headers (`infra/security-headers.json`), and the dependencies.

## Reporting a vulnerability

Please report it privately through GitHub: on the repository's **Security** tab, choose **Report a vulnerability**. Don't open a public issue for a security problem, because that discloses it before there is a fix.

Include what you found, how to reproduce it and what an attacker could do with it. I'll acknowledge the report within a week and keep you posted until it is fixed.

## Supported versions

Fixes go only into the version deployed at https://leftbauer.beta-site.us, which is always the latest release.
