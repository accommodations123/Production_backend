import multer from "multer";

export const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File size exceeds allowed limit"
      });
    }
  }

  if (err) {
    return res.status(400).json({ message: err.message });
  }

  next();
};
