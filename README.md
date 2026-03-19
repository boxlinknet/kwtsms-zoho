# kwtSMS for Zoho CRM

[![Zoho Marketplace](https://img.shields.io/badge/Zoho_Marketplace-kwtSMS-blue?logo=zoho)](https://marketplace.zoho.com/app/crm/kwtsms-for-zoho-crm)
[![Version](https://img.shields.io/badge/version-1.0-green)](https://github.com/boxlinknet/kwtsms-zoho/releases)
[![Edition](https://img.shields.io/badge/Zoho_CRM-Professional%2B-orange)](https://www.zoho.com/crm/zoho-crm-pricing.html)
[![License](https://img.shields.io/badge/license-Proprietary-lightgrey)](LICENSE)
[![kwtSMS](https://img.shields.io/badge/SMS_Gateway-kwtSMS-FFA200?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiI+PHRleHQgeT0iMTIiIGZvbnQtc2l6ZT0iMTIiPvCfk6g8L3RleHQ+PC9zdmc+)](https://www.kwtsms.com)
[![Arabic](https://img.shields.io/badge/lang-English%20%7C%20العربية-79CCF2)](#)

Send SMS from Zoho CRM via [kwtSMS](https://www.kwtsms.com) gateway.

## Overview

A lightweight SMS gateway connector that integrates [kwtSMS](https://www.kwtsms.com) into Zoho CRM. Send SMS messages directly from Contact, Lead, and Deal records, or automate SMS notifications using Zoho's built-in workflow rules.

## Features

- **Send SMS** from any Contact, Lead, or Deal record with one click
- **Workflow automation** via reusable Deluge functions that plug into Zoho's workflow rules
- **Arabic/RTL support** with full English and Arabic interface
- **Smart phone normalization** handles international formats, Arabic digits, local numbers
- **Message cleaning** strips emoji and hidden characters that cause delivery failures
- **Real-time character counter** with SMS page calculation (GSM-7 and Unicode)
- **Test mode** for safe development and testing
- **Daily sync** keeps balance, sender IDs, and coverage up to date

## Requirements

- Zoho CRM **Professional** edition or above
- A [kwtSMS](https://www.kwtsms.com) account with API access ([sign up free](https://www.kwtsms.com/signup))

## Installation

1. Install from the [Zoho Marketplace](https://marketplace.zoho.com/app/crm/kwtsms-for-zoho-crm)
2. Open the **kwtSMS** tab in Zoho CRM
3. Enter your kwtSMS API credentials and click **Login**
4. Select your sender ID and default country
5. Enable the gateway and start sending SMS

## Workflow Integration

Create Zoho CRM workflow rules that call `kwtsms_send()` to automate SMS on any CRM event:

- New Lead created: send welcome SMS
- Deal stage changed: notify customer
- Contact birthday: send greeting
- Invoice overdue: send reminder (via Zoho Flow)

## Development

```bash
npm install                  # Install dependencies
zet run                      # Start local dev server (HTTPS on port 5000)
zet validate                 # Check for errors
zet pack                     # Package for upload (dist/*.zip)
```

## Links

- **kwtSMS Website:** [kwtsms.com](https://www.kwtsms.com)
- **kwtSMS Support:** [kwtsms.com/support.html](https://www.kwtsms.com/support.html)
- **API Documentation:** [kwtsms.com/developers.html](https://www.kwtsms.com/developers.html)
- **Zoho CRM Developer Docs:** [zoho.com/crm/developer/docs/](https://www.zoho.com/crm/developer/docs/)

## Security

See [SECURITY.md](SECURITY.md) for security policies and reporting vulnerabilities.

## License

Copyright 2026 kwtSMS. All rights reserved.
