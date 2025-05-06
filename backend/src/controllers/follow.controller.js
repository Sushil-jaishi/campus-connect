import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Follow } from "../models/follow.model.js";
import { User } from "../models/user.model.js";

// Follow a user
const followUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  // Validate userId
  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }
  
  // Check if target user exists
  const userToFollow = await User.findById(userId);
  if (!userToFollow) {
    throw new ApiError(404, "User to follow not found");
  }
  
  // Prevent following self
  if (userId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot follow yourself");
  }
  
  // Check if already following
  const existingFollow = await Follow.findOne({
    followerId: req.user._id,
    followingId: userId
  });
  
  if (existingFollow) {
    throw new ApiError(400, "You are already following this user");
  }
  
  // Create new follow relationship
  const follow = await Follow.create({
    followerId: req.user._id,
    followingId: userId
  });
  
  return res
    .status(200)
    .json(new ApiResponse(200, follow, "User followed successfully"));
});

// Unfollow a user
const unfollowUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  // Validate userId
  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }
  
  // Check if target user exists
  const userToUnfollow = await User.findById(userId);
  if (!userToUnfollow) {
    throw new ApiError(404, "User to unfollow not found");
  }
  
  // Check if actually following
  const follow = await Follow.findOne({
    followerId: req.user._id,
    followingId: userId
  });
  
  if (!follow) {
    throw new ApiError(400, "You are not following this user");
  }
  
  // Delete the follow relationship
  await Follow.findByIdAndDelete(follow._id);
  
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User unfollowed successfully"));
});

// Get users that the current user is following
const getFollowing = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user._id;
  
  const following = await Follow.find({ followerId: userId })
    .populate("followingId", "username fullName profileImage bio")
    .sort({ createdAt: -1 });
    
  const followingList = following.map(follow => follow.followingId);
  
  return res
    .status(200)
    .json(new ApiResponse(200, followingList, "Following list fetched successfully"));
});

// Get followers of a user
const getFollowers = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.user._id;
  
  const followers = await Follow.find({ followingId: userId })
    .populate("followerId", "username fullName profileImage bio")
    .sort({ createdAt: -1 });
    
  const followersList = followers.map(follow => follow.followerId);
  
  return res
    .status(200)
    .json(new ApiResponse(200, followersList, "Followers list fetched successfully"));
});

// Check if a user is following another user
const checkFollowStatus = asyncHandler(async (req, res) => {
  const { targetUserId } = req.params;
  
  if (!targetUserId) {
    throw new ApiError(400, "Target user ID is required");
  }
  
  const isFollowing = await Follow.exists({
    followerId: req.user._id,
    followingId: targetUserId
  });
  
  return res
    .status(200)
    .json(new ApiResponse(200, { isFollowing: !!isFollowing }, "Follow status checked successfully"));
});

export {
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
  checkFollowStatus
}; 