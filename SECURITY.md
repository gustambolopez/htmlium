# Security Policy

We take security seriously. Here’s what you need to know.

---

## Supported Versions

| Version | Supported? |
| ------- | ---------- |
| 1.x.x   | Yes        |
| < 1.0   | No         |

---

## Reporting a Vulnerability

**Do not use public GitHub issues.** Contact via:

* **Discord:** `s16dih` (see source code)

Include:

* Type of vulnerability (e.g., xss, injection)
* Affected files and code location (branch, tag, commit, URL)
* Steps to reproduce
* Proof-of-concept, if available
* Potential impact

**Timeline:**

* Initial response: within 48 hours
* Status update: within 7 days
* Patch release: as soon as validated

---

## Known Limitations

* Basic sanitization may not catch all xss attacks
* yaml parser dependency (`js-yaml`) needs to be updated
* Client side only; handle sensitive data server-side

---

## Disclosure Policy

We will:

1. Confirm the issue and affected versions
2. Audit similar code
3. Prepare fixes
4. Release patched versions promptly

---

**Last Updated:** September 29, 2025
**License:** MIT ([LICENSE](LICENSE) file)
