---
name: Google Drive video thumbnails
description: Why Fitness Genie serves Drive video stills through its API rather than loading Drive thumbnail links directly.
---

Exercise video stills must be delivered through the authenticated API server using the stored Drive file ID; do not render Google Drive `thumbnailLink` or public thumbnail URLs directly in the mobile client. Large detail previews should request a larger Drive thumbnail, while compact list and PDF previews should retain the default size.

**Why:** Drive thumbnail URLs for private uploaded videos can be protected or expire, causing broken-image icons or valid-looking black image containers in Expo even though the video upload succeeded. Drive's default thumbnail is typically about 220 px and looks blurry when expanded across the detail page.

**How to apply:** Whenever exercise video media is rendered, build the image source from the app's thumbnail proxy endpoint. Keep Drive authorization and thumbnail retrieval on the server. Request a cache-busted 800 px source for the large exercise detail preview only. Before generating a PDF, fetch the standard proxied still and embed it as a data URL so the native print renderer does not depend on loading a remote protected image.