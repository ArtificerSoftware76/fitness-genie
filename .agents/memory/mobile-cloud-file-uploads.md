---
name: Mobile cloud-file uploads
description: Reliable upload transport for files selected from cloud providers on iOS and Android.
---

Use Expo's native file-system multipart uploader for mobile files returned by the document picker, rather than constructing React Native JavaScript `FormData` with the selected URI.

**Why:** Provider-backed files such as Google Drive selections can use URI semantics that JavaScript `FormData` uploads handle inconsistently even when the picker copies the file into app cache.

**How to apply:** Keep browser uploads on browser `FormData`, but route iOS and Android document-picker or camera assets through the native file uploader and parse non-JSON server failures defensively.