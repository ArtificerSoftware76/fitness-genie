import { Router, type IRouter } from "express";
import multer from "multer";
import { ReplitConnectors } from "@replit/connectors-sdk";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 250 * 1024 * 1024 } });
const FOLDER_NAME = "Fitness Genie Data";
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const DRIVE_UPLOAD_FIELDS = "id,name,mimeType,webViewLink,thumbnailLink";

function getConnector() {
  return new ReplitConnectors();
}

function isGoogleUploadSession(location: string): boolean {
  try {
    const url = new URL(location);
    return url.protocol === "https:"
      && (url.hostname === "www.googleapis.com" || url.hostname.endsWith(".googleapis.com"));
  } catch {
    return false;
  }
}

function resizeThumbnailLink(thumbnailLink: string, size: number | undefined): string {
  if (!size) return thumbnailLink;
  return thumbnailLink.replace(/=s\d+(?:-[^?&#]*)?(?=$|[&#])/, `=s${size}`);
}

async function ensureFitnessFolder() {
  const connectors = getConnector();
  const query = encodeURIComponent(`name = '${FOLDER_NAME}' and mimeType = '${DRIVE_FOLDER_MIME}' and trashed = false`);
  const found = await connectors.proxy("google-drive", `/drive/v3/files?q=${query}&fields=files(id,name,mimeType,webViewLink)&pageSize=100`, { method: "GET" });
  if (!found.ok) throw new Error(`Google Drive folder lookup failed (${found.status})`);
  const data = await found.json() as { files?: Array<{ id: string; name: string; mimeType: string; webViewLink?: string }> };
  if (data.files?.[0]) return data.files[0];

  const created = await connectors.proxy("google-drive", "/drive/v3/files?fields=id,name,mimeType,webViewLink", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: DRIVE_FOLDER_MIME }),
  });
  if (!created.ok) throw new Error(`Google Drive folder creation failed (${created.status})`);
  return await created.json() as { id: string; name: string; mimeType: string; webViewLink?: string };
}

router.get("/drive/folder", async (_req, res) => {
  try {
    const folder = await ensureFitnessFolder();
    res.json({ ...folder, ready: true });
  } catch (error) {
    res.status(502).json({ message: error instanceof Error ? error.message : "Google Drive is unavailable" });
  }
});

router.get("/drive/thumbnail/:fileId", async (req, res) => {
  const fileId = String(req.params.fileId ?? "").trim();
  if (!fileId) {
    res.status(400).json({ message: "A Drive file ID is required." });
    return;
  }

  try {
    const metadataResponse = await getConnector().proxy("google-drive", `/drive/v3/files/${encodeURIComponent(fileId)}?fields=thumbnailLink`, { method: "GET" });
    if (!metadataResponse.ok) {
      res.status(metadataResponse.status === 404 ? 404 : 502).json({ message: "Exercise video thumbnail is unavailable." });
      return;
    }

    const metadata = await metadataResponse.json() as { thumbnailLink?: string };
    if (!metadata.thumbnailLink) {
      res.status(404).json({ message: "Exercise video thumbnail is not ready yet." });
      return;
    }

    const requestedSizeValue = typeof req.query.size === "string" ? Number(req.query.size) : NaN;
    const requestedSize = Number.isInteger(requestedSizeValue) ? Math.min(Math.max(requestedSizeValue, 220), 1600) : undefined;
    const thumbnailResponse = await fetch(resizeThumbnailLink(metadata.thumbnailLink, requestedSize));
    if (!thumbnailResponse.ok) {
      res.status(502).json({ message: "Exercise video thumbnail could not be loaded." });
      return;
    }

    const contentType = thumbnailResponse.headers.get("content-type") || "image/jpeg";
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("Content-Type", contentType);
    res.send(Buffer.from(await thumbnailResponse.arrayBuffer()));
  } catch (error) {
    res.status(502).json({ message: error instanceof Error ? error.message : "Google Drive thumbnail is unavailable." });
  }
});

router.post("/drive/upload", (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ message: "The selected video is larger than the 250 MB upload limit." });
      return;
    }
    res.status(400).json({ message: error instanceof Error ? error.message : "The selected video could not be read." });
  });
}, async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "A video file is required." });
    return;
  }
  const exerciseName = String(req.body.exerciseName ?? "Exercise").trim() || "Exercise";
  try {
    const folder = await ensureFitnessFolder();
    const extension = (req.file.originalname.match(/\.[a-z0-9]+$/i)?.[0] ?? ".mp4").toLowerCase();
    const safeName = exerciseName.replace(/[^a-z0-9 _-]/gi, "").replace(/\s+/g, " ").trim() || "Exercise";
    const fileName = `${safeName}${extension}`;
    const metadata = JSON.stringify({ name: fileName, parents: [folder.id] });
    const mimeType = req.file.mimetype || "video/mp4";
    const sessionResponse = await getConnector().proxy("google-drive", `/upload/drive/v3/files?uploadType=resumable&fields=${DRIVE_UPLOAD_FIELDS}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(req.file.size),
        "X-Upload-Content-Type": mimeType,
      },
      body: metadata,
    });
    if (!sessionResponse.ok) {
      const detail = (await sessionResponse.text()).slice(0, 500);
      console.error("Google Drive upload session rejected", { status: sessionResponse.status, detail });
      throw new Error(`Google Drive rejected the video upload session (${sessionResponse.status}).`);
    }
    const uploadLocation = sessionResponse.headers.get("location");
    if (!uploadLocation || !isGoogleUploadSession(uploadLocation)) {
      console.error("Google Drive upload session returned an invalid location");
      throw new Error("Google Drive did not return a valid video upload session.");
    }

    const uploadResponse = await fetch(uploadLocation, {
      method: "PUT",
      headers: {
        "Content-Length": String(req.file.size),
        "Content-Type": mimeType,
      },
      body: req.file.buffer,
    });
    if (!uploadResponse.ok) {
      const detail = (await uploadResponse.text()).slice(0, 500);
      console.error("Google Drive video transfer rejected", { status: uploadResponse.status, detail });
      throw new Error(`Google Drive rejected the video transfer (${uploadResponse.status}).`);
    }

    const uploaded = await uploadResponse.json() as { id: string; name: string; mimeType: string; webViewLink?: string; thumbnailLink?: string };
    res.json({ ...uploaded, webViewLink: uploaded.webViewLink ?? `https://drive.google.com/file/d/${uploaded.id}/view` });
  } catch (error) {
    res.status(502).json({ message: error instanceof Error ? error.message : "Google Drive upload failed" });
  }
});

export default router;