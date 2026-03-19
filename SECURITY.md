# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in this extension, please report it responsibly.

**Email:** support@kwtsms.com

**Please include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Response time:** We aim to acknowledge reports within 48 hours and provide a resolution timeline within 5 business days.

**Do not** open a public GitHub issue for security vulnerabilities.

## Security Practices

- API credentials are stored in Zoho Hidden Custom Variables (server-side only)
- No credentials are exposed to frontend widgets or browser JavaScript
- All external API calls are made server-side via Deluge `invokeURL`
- Phone numbers are masked in logs (last 4 digits only)
- Input sanitization on all user inputs (phone numbers, message text)
- Generic error messages for authentication failures (prevents enumeration)
- HTTPS POST for all API communication (never GET)
- No client-side credential storage in production (credentials stored in Zoho Hidden Custom Variables, never in browser). Local dev server uses localStorage for testing convenience only.
