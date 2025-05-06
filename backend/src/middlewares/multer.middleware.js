import multer from "multer"
import path from "path"
import fs from "fs"

// Ensure directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Ensure required directories exist
ensureDirectoryExists("./public/profileImages");
ensureDirectoryExists("./public/resources");

// Profile image storage
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/profileImages")
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname)
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    cb(null, uniqueName)
  },
})

// Resource storage (for post attachments like images and PDFs)
const resourceStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/resources")
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname)
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    cb(null, uniqueName)
  },
})

export const upload = multer({ storage: profileStorage })
export const resourceUpload = multer({ storage: resourceStorage })
