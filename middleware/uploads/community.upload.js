import multer from "multer";
import multerS3 from "multer-s3";
import { s3 } from "../../config/s3.js";

/*
  COMMUNITY POST MEDIA
  - images: max 5 MB
  - videos: max 50 MB
*/

export const uploadCommunityMedia = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const type = file.mimetype.startsWith("video/") ? "videos" : "images";

      cb(
        null,
        `communities/posts/${type}/${Date.now()}-${file.originalname}`
      );
    }
  }),

  limits: {
    fileSize: 50 * 1024 * 1024 // max allowed (video)
  },

  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");

    if (!isImage && !isVideo) {
      return cb(new Error("Only image and video files are allowed"));
    }

    // Optional: enforce image size separately
    if (isImage && file.size > 5 * 1024 * 1024) {
      return cb(new Error("Image size must be under 5MB"));
    }

    cb(null, true);
  }
});
