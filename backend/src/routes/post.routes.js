import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { postUpload } from "../middlewares/postUpload.middleware.js"
import {
  createPost,
  getAllPosts,
  getPostById,
  getUserPosts,
  updatePost,
  deletePost,
  likeUnlikePost,
} from "../controllers/post.controller.js"

const router = Router()

// Protect all routes with JWT authentication
router.use(verifyJWT)

// Post routes
router
  .route("/")
  .post(postUpload.array("files", 5), createPost)
  .get(getAllPosts)

router.route("/:postId").get(getPostById).patch(updatePost).delete(deletePost)

router.route("/user/:userId").get(getUserPosts)

router.route("/:postId/like").post(likeUnlikePost)

export default router
