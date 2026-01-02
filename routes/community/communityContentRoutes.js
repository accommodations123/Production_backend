import express from "express";
import {
  createPost,
  getFeed,
  deletePost,
  addResource,
  getResources,
  deleteResource
} from "../../controllers/community/communityContentController.js";
import { uploadCommunityMedia,uploadCommunityResource } from "../../middleware/uploads/community.upload.js";
import {multerErrorHandler} from '../../middleware/uploads/multerErrorHandler.js'
import userAuth from "../../middleware/userAuth.js";
import {postRateLimit,resourceRateLimit} from '../../middleware/rateLimiter.js'
const router = express.Router();

/* =========================
   FEED ROUTES
========================= */

/*
  Create a post (text / image / video)
  POST /communities/:id/posts
*/
router.post("/communities/:id/posts",userAuth, uploadCommunityMedia.array("media", 5),multerErrorHandler,createPost);

/*
  Get community feed (paginated)
  GET /communities/:id/posts?page=1
*/
router.get("/communities/:id/posts",getFeed);

/*
  Soft delete post
  DELETE /communities/posts/:postId
*/
router.delete("/communities/posts/:postId",userAuth,deletePost);

/* =========================
   RESOURCES ROUTES
========================= */

/*
  Add resource (admin / owner only)
  POST /communities/:id/resources
*/
router.post("/communities/:id/resources",userAuth,resourceRateLimit,uploadCommunityResource.single("file"),multerErrorHandler,addResource);

/*
  Get community resources
  GET /communities/:id/resources
*/
router.get("/communities/:id/resources",getResources);

/*
  Soft delete resource
  DELETE /communities/resources/:resourceId
*/
router.delete("/communities/resources/:resourceId",userAuth,deleteResource);

export default router;
