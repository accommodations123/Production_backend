import multer from "multer";
import multerS3 from "multer-s3";
import { s3 } from "../../config/s3.js";

/* COMMUNITY AVATAR & COVER (5 MB) */
export const uploadCommunityImages = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      cb(
        null,
        `communities/${file.fieldname}/${Date.now()}-${file.originalname}`
      );
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith("image/")
      ? cb(null, true)
      : cb(new Error("Only image files allowed"));
  }
});
