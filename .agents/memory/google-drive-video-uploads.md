---
name: Google Drive video uploads
description: Reliable transfer path for large video bodies through the Replit Google Drive connector.
---

Create Google Drive resumable upload sessions through the authenticated connector, then send the video bytes directly to the validated Google session URL.

**Why:** Sending the full multipart video body through the connector proxy can trigger an HTML Cloudflare 403 challenge before Google Drive processes the request, even though metadata and folder requests work.

**How to apply:** Keep metadata/session creation behind the connector for OAuth. Validate that the returned session uses HTTPS on a Google APIs host, then PUT the exact byte length and MIME type directly to that one-time URL.