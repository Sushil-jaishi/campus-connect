import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createComment,
  getPostComments,
  updateComment,
  deleteComment
} from "../controllers/comment.controller.js";

const router = Router();

// Protect all routes with JWT authentication
router.use(verifyJWT);

// Comment routes
router.route("/").post(createComment);
router.route("/post/:postId").get(getPostComments);
router.route("/:commentId").patch(updateComment).delete(deleteComment);

export default router; 