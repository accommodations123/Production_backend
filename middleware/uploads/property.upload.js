import multer from "multer";
import multerS3 from "multer-s3";
import { s3 } from "../../config/s3.js";

/* PROPERTY IMAGES (5 MB) */
export const uploadPropertyImages = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      cb(null, `properties/images/${Date.now()}-${file.originalname}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
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
      cb(null, `properties/documents/${Date.now()}-${file.originalname}`);
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
      cb(null, `properties/videos/${Date.now()}-${file.originalname}`);
    }
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith("video/")
      ? cb(null, true)
      : cb(new Error("Only video files allowed"));
  }
});
