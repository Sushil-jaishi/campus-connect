import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";

// Send a message to another user
const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId, message } = req.body;
  
  // Validate required fields
  if (!receiverId) {
    throw new ApiError(400, "Receiver ID is required");
  }
  
  if (!message?.trim()) {
    throw new ApiError(400, "Message content is required");
  }
  
  // Check if receiver exists
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new ApiError(404, "Receiver not found");
  }
  
  // Prevent sending message to self
  if (receiverId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot send a message to yourself");
  }
  
  // Create and save the message
  const newMessage = await Message.create({
    senderId: req.user._id,
    receiverId,
    message
  });
  
  return res
    .status(201)
    .json(new ApiResponse(201, newMessage, "Message sent successfully"));
});

// Get conversation with another user
const getConversation = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }
  
  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  
  // Find all messages between the two users
  const messages = await Message.find({
    $or: [
      { senderId: req.user._id, receiverId: userId },
      { senderId: userId, receiverId: req.user._id }
    ]
  }).sort({ createdAt: 1 });
  
  return res
    .status(200)
    .json(new ApiResponse(200, messages, "Conversation fetched successfully"));
});

// Get all conversations (unique users)
const getAllConversations = asyncHandler(async (req, res) => {
  // Find all users the current user has exchanged messages with
  const sentMessages = await Message.find({ senderId: req.user._id })
    .select("receiverId createdAt")
    .sort({ createdAt: -1 });
    
  const receivedMessages = await Message.find({ receiverId: req.user._id })
    .select("senderId createdAt")
    .sort({ createdAt: -1 });
  
  // Combine and get unique users
  const userIds = new Set();
  
  sentMessages.forEach(msg => userIds.add(msg.receiverId.toString()));
  receivedMessages.forEach(msg => userIds.add(msg.senderId.toString()));
  
  // Get user details and latest message for each conversation
  const conversations = await Promise.all(
    Array.from(userIds).map(async (userId) => {
      const user = await User.findById(userId).select("username fullName profileImage");
      
      // Get the latest message
      const latestMessage = await Message.findOne({
        $or: [
          { senderId: req.user._id, receiverId: userId },
          { senderId: userId, receiverId: req.user._id }
        ]
      }).sort({ createdAt: -1 });
      
      return {
        user,
        latestMessage
      };
    })
  );
  
  return res
    .status(200)
    .json(new ApiResponse(200, conversations, "All conversations fetched successfully"));
});

// Delete a message
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  
  if (!messageId) {
    throw new ApiError(400, "Message ID is required");
  }
  
  const message = await Message.findById(messageId);
  
  if (!message) {
    throw new ApiError(404, "Message not found");
  }
  
  // Check if user is the sender of the message
  if (message.senderId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You cannot delete this message");
  }
  
  await Message.findByIdAndDelete(messageId);
  
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Message deleted successfully"));
});

export {
  sendMessage,
  getConversation,
  getAllConversations,
  deleteMessage
}; 