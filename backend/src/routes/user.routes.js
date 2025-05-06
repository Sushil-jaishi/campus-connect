import { Router } from "express"
import { upload } from "../middlewares/multer.middleware.js"
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserProfile,
  getUserById,
  changeUserRole,
  getAllUsers,
  searchUsers
} from "../controllers/user.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()

// Auth routes (no authentication required)
router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route("/refresh-token").post(refreshAccessToken)

// User routes (authentication required)
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/profile").get(verifyJWT, getCurrentUser)
router.route("/profile/:userId").get(verifyJWT, getUserById)
router
  .route("/update-profile")
  .patch(verifyJWT, upload.single("profileImage"), updateUserProfile)
  
// Admin routes (authentication required + admin role check in controller)
router.route("/admin/users").get(verifyJWT, getAllUsers)
router.route("/admin/users/:userId/role").patch(verifyJWT, changeUserRole)

// Admin only routes
router.route("/get-all").get(verifyJWT, getAllUsers)

// Public search route
router.route("/search").get(verifyJWT, searchUsers)

export default router
