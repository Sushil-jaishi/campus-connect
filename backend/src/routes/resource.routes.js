import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { resourceUpload } from "../middlewares/multer.middleware.js";
import {
  addResource,
  getPostResources,
  deleteResource,
  updateResourceTitle
} from "../controllers/resource.controller.js";

const router = Router();

// Protect all routes with JWT authentication
router.use(verifyJWT);

// Resource routes
router.route("/").post(resourceUpload.single("file"), addResource);
router.route("/post/:postId").get(getPostResources);
router.route("/:resourceId").delete(deleteResource);
router.route("/:resourceId/title").patch(updateResourceTitle);

export default router; 