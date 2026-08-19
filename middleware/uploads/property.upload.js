import multer from "multer";
import multerS3 from "multer-s3";
import { v4 as uuidv4 } from "uuid";
import { s3 } from "../../config/s3.js";

const MIME_MAP = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm"
};

const getSafeExtension = (mimetype, defaultExt = "bin") => {
  return MIME_MAP[mimetype] || defaultExt;
};

/* PROPERTY IMAGES (5 MB) */
export const uploadPropertyImages = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const ext = getSafeExtension(file.mimetype, "jpg");
      cb(null, `properties/images/${uuidv4()}.${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new Error("Only image files allowed"));
  }
});

/* PROPERTY DOCUMENTS (10 MB) */
export const uploadPropertyDocs = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const ext = getSafeExtension(file.mimetype, "pdf");
      cb(null, `properties/documents/${uuidv4()}.${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed =
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf" ||
      file.mimetype.includes("msword") ||
      file.mimetype.includes("officedocument");

    allowed ? cb(null, true) : cb(new Error("Invalid document type"));
  }
});

/* PROPERTY VIDEOS (100 MB) */
export const uploadPropertyVideos = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const ext = getSafeExtension(file.mimetype, "mp4");
      cb(null, `properties/videos/${uuidv4()}.${ext}`);
    }
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith("video/")
      ? cb(null, true)
      : cb(new Error("Only video files allowed"));
  }
});
