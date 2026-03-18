# kwtSMS for Zoho CRM

Send SMS from Zoho CRM via Kuwait's leading SMS gateway.

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
- A [kwtSMS](https://www.kwtsms.com) account with API access

## Installation

1. Install from the [Zoho Marketplace](https://marketplace.zoho.com/app/crm)
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

## Support

- **kwtSMS Support:** [kwtsms.com/support.html](https://www.kwtsms.com/support.html)
- **API Documentation:** [kwtsms.com/developers.html](https://www.kwtsms.com/developers.html)
- **Zoho CRM Developer Docs:** [zoho.com/crm/developer/docs/](https://www.zoho.com/crm/developer/docs/)

## Security

See [SECURITY.md](SECURITY.md) for security policies and reporting vulnerabilities.

## License

Copyright 2026 kwtSMS. All rights reserved.
