# Security Policy 🛡️

## Supported Versions

We are currently in active development. Please ensure you are using the latest version of the `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ Yes             |
| < 1.0   | ❌ No              |

## Reporting a Vulnerability

**Please do not open a public issue for security vulnerabilities.** We take the security of CogniCampus seriously. If you discover a security-related issue (such as data leaks, RLS bypasses, or authentication flaws), please help us by following these steps:

1. **Private Report:** Send an email to [your-email@example.com] with the subject "SECURITY VULNERABILITY REPORT".
2. **Details:** Include a description of the vulnerability and steps to reproduce it.
3. **Response:** We will acknowledge your report within 48 hours and provide a timeline for a fix.

## Security Best Practices for Users

* **Environment Variables:** Never commit your `.env` file to version control.
* **Supabase Keys:** Ensure your `SUPABASE_SERVICE_ROLE_KEY` is never exposed in the frontend code.
* **RLS:** Always keep Row-Level Security (RLS) enabled on production tables.

---
**Thank you for helping keep the student community safe!**
