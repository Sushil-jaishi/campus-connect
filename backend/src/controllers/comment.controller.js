import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.model.js";
import { Post } from "../models/post.model.js";

// Create a new comment
const createComment = asyncHandler(async (req, res) => {
  const { postId, content } = req.body;
  
  if (!content?.trim()) {
    throw new ApiError(400, "Comment content is required");
  }
  
  if (!postId) {
    throw new ApiError(400, "Post ID is required");
  }
  
  // Check if post exists
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }
  
  const comment = await Comment.create({
    postId,
    authorId: req.user._id,
    content
  });
  
  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment created successfully"));
});

// Get all comments for a post
const getPostComments = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  
  if (!postId) {
    throw new ApiError(400, "Post ID is required");
  }
  
  const comments = await Comment.find({ postId })
    .populate("authorId", "username fullName profileImage")
    .sort({ createdAt: -1 });
  
  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

// Update a comment
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  
  if (!content?.trim()) {
    throw new ApiError(400, "Comment content is required");
  }
  
  const comment = await Comment.findById(commentId);
  
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  
  // Check if user is the author of the comment
  if (comment.authorId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this comment");
  }
  
  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    { $set: { content } },
    { new: true }
  );
  
  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

// Delete a comment
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  
  const comment = await Comment.findById(commentId);
  
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  
  // Check if user is the author of the comment
  if (comment.authorId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }
  
  await Comment.findByIdAndDelete(commentId);
  
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export {
  createComment,
  getPostComments,
  updateComment,
  deleteComment
}; 