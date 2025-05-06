import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
  checkFollowStatus
} from "../controllers/follow.controller.js";

const router = Router();

// Protect all routes with JWT authentication
router.use(verifyJWT);

// Follow routes
router.route("/:userId").post(followUser).delete(unfollowUser);
// Split the routes to handle the optional userId parameter
router.route("/following").get(getFollowing);
router.route("/following/:userId").get(getFollowing);
router.route("/followers").get(getFollowers);
router.route("/followers/:userId").get(getFollowers);
router.route("/status/:targetUserId").get(checkFollowStatus);

export default router; 