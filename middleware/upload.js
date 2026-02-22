import multer from "multer";
import multerS3 from "multer-s3";
import { s3 } from "../config/s3.js";

// Helper generic uploader factory
const createUploader = (folderName) => multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const fileName = `${folderName}/${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});

// Specific uploaders
export const upload = createUploader('properties'); // Keep backward compatibility for properties if needed
export const uploadProfileImage = createUploader('users');
export const uploadHostProfile = createUploader('hosts/profiles');
export const uploadCommunityImage = createUploader('community');
export const uploadBuySellImage = createUploader('buysell');
export const uploadPropertyImage = createUploader('properties/images');
export const uploadTravelImage = createUploader('travel');

export const uploadHostDocs = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      cb(null, `hosts/documents/${Date.now()}-${file.originalname}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowed =
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf" ||
      file.mimetype.includes("msword") ||
      file.mimetype.includes("officedocument");

    if (allowed) cb(null, true);
    else cb(new Error("Only PDF, image, or document files are allowed"));
  }
});

export const uploadDocs = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      cb(null, `properties/documents/${Date.now()}-${file.originalname}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Allow PDFs, images, docs
    const allowed =
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf" ||
      file.mimetype.includes("msword") ||
      file.mimetype.includes("officedocument");

    if (allowed) cb(null, true);
    else cb(new Error("Only PDF, image, or document files are allowed"));
  }
});

export const uploadVideo = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      cb(null, `properties/videos/${Date.now()}-${file.originalname}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowed =
      file.mimetype.startsWith("video/") ||
      file.mimetype === "video/mp4" ||
      file.mimetype === "video/mov" ||
      file.mimetype === "video/mkv" ||
      file.mimetype === "video/avi";

    if (allowed) cb(null, true);
    else cb(new Error("Only video files are allowed (mp4, mov, mkv, avi)"));
  }
});

