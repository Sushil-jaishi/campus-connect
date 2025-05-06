import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Resource } from "../models/resource.model.js";
import { Post } from "../models/post.model.js";
import fs from "fs";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Add a resource to a post
const addResource = asyncHandler(async (req, res) => {
  const { postId, type, title } = req.body;
  
  if (!postId) {
    throw new ApiError(400, "Post ID is required");
  }
  
  if (!type || !["image", "pdf"].includes(type)) {
    throw new ApiError(400, "Valid resource type is required (image or pdf)");
  }
  
  // Check if post exists
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }
  
  // Check if user is the owner of the post
  if (post.authorId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the post owner can add resources");
  }
  
  // Check if file is uploaded
  if (!req.file) {
    throw new ApiError(400, "File is required");
  }
  
  // Get file path
  const filePath = req.file.path;
  
  // Store the relative path (for serving the file later)
  const relativePath = filePath.replace(/\\/g, '/'); // Normalize path for Windows
  
  console.log("Resource file saved at:", relativePath);
  
  // Create resource with local file path
  const resource = await Resource.create({
    postId,
    type,
    url: relativePath,
    title: title || req.file.originalname // Use original filename as default title
  });
  
  console.log("Resource created:", resource);
  
  return res
    .status(201)
    .json(new ApiResponse(201, resource, "Resource added successfully"));
});

// Get all resources for a post
const getPostResources = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  
  if (!postId) {
    throw new ApiError(400, "Post ID is required");
  }
  
  const resources = await Resource.find({ postId });
  
  return res
    .status(200)
    .json(new ApiResponse(200, resources, "Resources fetched successfully"));
});

// Delete a resource
const deleteResource = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  
  if (!resourceId) {
    throw new ApiError(400, "Resource ID is required");
  }
  
  const resource = await Resource.findById(resourceId);
  
  if (!resource) {
    throw new ApiError(404, "Resource not found");
  }
  
  // Check if user is the owner of the post the resource belongs to
  const post = await Post.findById(resource.postId);
  
  if (!post) {
    throw new ApiError(404, "Associated post not found");
  }
  
  if (post.authorId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the post owner can delete resources");
  }
  
  await Resource.findByIdAndDelete(resourceId);
  
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Resource deleted successfully"));
});

// Update resource title
const updateResourceTitle = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const { title } = req.body;
  
  if (!resourceId) {
    throw new ApiError(400, "Resource ID is required");
  }
  
  if (!title?.trim()) {
    throw new ApiError(400, "Title is required");
  }
  
  const resource = await Resource.findById(resourceId);
  
  if (!resource) {
    throw new ApiError(404, "Resource not found");
  }
  
  // Check if user is the owner of the post the resource belongs to
  const post = await Post.findById(resource.postId);
  
  if (!post) {
    throw new ApiError(404, "Associated post not found");
  }
  
  if (post.authorId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the post owner can update resources");
  }
  
  const updatedResource = await Resource.findByIdAndUpdate(
    resourceId,
    { $set: { title } },
    { new: true }
  );
  
  return res
    .status(200)
    .json(new ApiResponse(200, updatedResource, "Resource title updated successfully"));
});

export {
  addResource,
  getPostResources,
  deleteResource,
  updateResourceTitle
}; 