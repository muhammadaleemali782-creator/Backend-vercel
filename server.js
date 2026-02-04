const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// ─── ENSURE UPLOADS FOLDER EXISTS ───
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── STATIC FILES ───
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── STORAGE ───
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(
      null,
      Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        path.extname(file.originalname)
    )
});

// ─── MEDIA UPLOAD (IMAGE / GIF / VIDEO) ───
const mediaUpload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image / gif / video allowed"));
    }
  }
});

// ─── SOUND UPLOAD ───
const soundUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("audio/")) {
      return cb(new Error("Only audio files allowed"));
    }
    cb(null, true);
  }
});

// ─── FILES ───
const IMAGE_FILE = "lastImage.json";
const TOP_MEDIA_FILE = "topMedia.json";
const YES_MEDIA_FILE = "yesMedia.json";
const TOP_NOTE_FILE = "topNote.json";   // ✅ NEW
const NOTES_FILE = "notes.json";
const SOUND_FILE = "lastSound.json";

// ─── SAFE JSON HELPERS ───
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function readJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file));
  } catch {
    return fallback;
  }
}

// ─── MEDIA HELPERS ───
function saveTopMedia(url, type) {
  writeJSON(TOP_MEDIA_FILE, { url, type });
}
function getTopMedia() {
  return readJSON(TOP_MEDIA_FILE, null);
}

function saveYesMedia(url, type) {
  writeJSON(YES_MEDIA_FILE, { url, type });
}
function getYesMedia() {
  return readJSON(YES_MEDIA_FILE, null);
}

// ─── TOP NOTE HELPERS (RED CIRCLE TEXT) ───
function saveTopNote(text) {
  writeJSON(TOP_NOTE_FILE, { text });
}
function getTopNote() {
  return readJSON(TOP_NOTE_FILE, { text: "" }).text;
}

// ─── LEGACY IMAGE ───
function saveLastImage(url) {
  writeJSON(IMAGE_FILE, { imageUrl: url });
}
function getLastImage() {
  return readJSON(IMAGE_FILE, {}).imageUrl || null;
}

// ─── NOTES (NO BUTTON) ───
function saveNotes(notes) {
  writeJSON(NOTES_FILE, { notes });
}
function getNotes() {
  return readJSON(NOTES_FILE, { notes: [] }).notes;
}

// ─── SOUND ───
function saveLastSound(url) {
  writeJSON(SOUND_FILE, { soundUrl: url });
}
function getLastSound() {
  return readJSON(SOUND_FILE, {}).soundUrl || null;
}

// ───────────────────────── ROUTES ─────────────────────────

// LEGACY IMAGE
app.post("/upload", mediaUpload.single("photo"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false });
  const url = `http://localhost:3000/uploads/${req.file.filename}`;
  saveLastImage(url);
  res.json({ success: true, imageUrl: url });
});

// TOP MEDIA
app.post("/upload-top-media", mediaUpload.single("media"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false });
  const url = `http://localhost:3000/uploads/${req.file.filename}`;
  saveTopMedia(url, req.file.mimetype);
  res.json({ success: true, url });
});
app.get("/get-top-media", (req, res) => {
  res.json(getTopMedia());
});

// YES MEDIA
app.post("/upload-yes-media", mediaUpload.single("media"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false });
  const url = `http://localhost:3000/uploads/${req.file.filename}`;
  saveYesMedia(url, req.file.mimetype);
  res.json({ success: true, url });
});
app.get("/get-yes-media", (req, res) => {
  res.json(getYesMedia());
});

// TOP NOTE (ADMIN CONTROLLED TEXT)
app.post("/set-top-note", (req, res) => {
  if (!req.body.text) return res.status(400).json({ success: false });
  saveTopNote(req.body.text);
  res.json({ success: true });
});
app.get("/get-top-note", (req, res) => {
  res.json({ text: getTopNote() });
});

// NO BUTTON NOTES
app.post("/set-notes", (req, res) => {
  if (!Array.isArray(req.body.notes))
    return res.status(400).json({ success: false });
  saveNotes(req.body.notes);
  res.json({ success: true });
});
app.get("/get-notes", (req, res) => {
  res.json({ notes: getNotes() });
});

// SOUND
app.post("/upload-sound", soundUpload.single("sound"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false });
  const url = `http://localhost:3000/uploads/${req.file.filename}`;
  saveLastSound(url);
  res.json({ success: true, soundUrl: url });
});
app.get("/get-sound", (req, res) => {
  res.json({ soundUrl: getLastSound() });
});

// ─── GLOBAL ERROR ───
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(500).json({ success: false, message: err.message });
});

// ─── START SERVER ───
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});