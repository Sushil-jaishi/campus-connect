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
} from "../controllers/user.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()

router.route("/register").post(registerUser)
router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/profile").get(verifyJWT, getCurrentUser)
router
  .route("/update-profile")
  .patch(verifyJWT, upload.single("profileImage"), updateUserProfile)

export default router
