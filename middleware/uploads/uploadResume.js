import multer from "multer";
import multerS3 from "multer-s3";
import { v4 as uuidv4 } from "uuid";
import { s3 } from "../../config/s3.js";

const uploadResume = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    acl: "private",
    key: (req, file, cb) => {
      const ext = file.originalname.split(".").pop();
      const fileName = `resumes/${uuidv4()}.${ext}`;
      cb(null, fileName);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB — matches frontend allowance
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeToExt = {
      "application/pdf": "pdf",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx"
    };

    const ext = file.originalname.split(".").pop().toLowerCase();
    const expectedExt = allowedMimeToExt[file.mimetype];

    if (!expectedExt || expectedExt !== ext) {
      return cb(new Error("Only PDF and Word documents (.pdf, .doc, .docx) are allowed."));
    }
    cb(null, true);
  }
});

export default uploadResume;
