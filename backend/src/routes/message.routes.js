import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  sendMessage,
  getConversation,
  getAllConversations,
  deleteMessage
} from "../controllers/message.controller.js";

const router = Router();

// Protect all routes with JWT authentication
router.use(verifyJWT);

// Message routes
router.route("/").post(sendMessage);
router.route("/conversations").get(getAllConversations);
router.route("/conversation/:userId").get(getConversation);
router.route("/:messageId").delete(deleteMessage);

export default router; 