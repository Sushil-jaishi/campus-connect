import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Post } from "../models/post.model.js"
import { Resource } from "../models/resource.model.js"
import { Comment } from "../models/comment.model.js"
import { User } from "../models/user.model.js"
import mongoose from "mongoose"
import fs from "fs"
import { uploadOnCloudinary } from "../utils/cloudinary.js"

// Create a new post
const createPost = asyncHandler(async (req, res) => {
  console.log("Creating post with body:", JSON.stringify(req.body));
  console.log("Files:", req.files ? req.files.length : "none");

  const { content, hashtags = [], mentions = [] } = req.body

  if (!content || content.trim() === "") {
    throw new ApiError(400, "Content is required")
  }

  try {
    // Parse JSON strings if they exist, otherwise use empty arrays
    const parsedHashtags = hashtags ? 
      (typeof hashtags === 'string' ? JSON.parse(hashtags) : hashtags) : 
      [];
    
    let parsedMentions = mentions ? 
      (typeof mentions === 'string' ? JSON.parse(mentions) : mentions) : 
      [];
    
    console.log("Parsed mentions:", parsedMentions);
    
    // If mentions are usernames, convert them to user IDs
    if (parsedMentions.length > 0 && typeof parsedMentions[0] === 'string') {
      // Find users by usernames
      const mentionedUsers = await User.find({
        username: { $in: parsedMentions }
      }).select('_id');
      
      // Extract just the IDs
      parsedMentions = mentionedUsers.map(user => user._id);
      console.log("Converted mentions to user IDs:", parsedMentions);
    }
    
    // Create post
    const post = await Post.create({
      content,
      authorId: req.user._id,
      hashtags: parsedHashtags,
      mentions: parsedMentions,
    })

    console.log("Post created:", post._id);

    // Handle resources (images/PDFs) if any
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} files for post ${post._id}`);
      
      const resourcePromises = req.files.map(async (file) => {
        const fileType = file.mimetype.startsWith('image') ? 'image' : 'pdf'
        
        // Upload file to cloudinary if using cloudinary
        // const cloudinaryResult = await uploadOnCloudinary(file.path)
        // const url = cloudinaryResult?.url || file.path
        
        const url = file.path // For local storage
        
        return Resource.create({
          postId: post._id,
          type: fileType,
          url,
          title: req.body.title || file.originalname
        })
      })

      await Promise.all(resourcePromises)
    }

    // Get the created post with resources
    const createdPost = await Post.findById(post._id)
      .populate("authorId", "name username profileImage")
    
    console.log("Returning created post with ID:", createdPost._id);

    return res.status(201).json(
      new ApiResponse(201, createdPost || {}, "Post created successfully")
    )
  } catch (error) {
    console.error("Error in post creation:", error);
    throw new ApiError(500, "Failed to create post: " + error.message);
  }
})

// Get all posts with pagination
const getAllPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const skip = (page - 1) * limit

  const posts = await Post.find()
    .sort({ createdAt: -1 }) // Newest first
    .skip(skip)
    .limit(limit)
    .populate("authorId", "name username profileImage")
    .populate("mentions", "username profileImage")
  
  // Get resources for each post
  const postsWithResources = await Promise.all(
    posts.map(async (post) => {
      const resources = await Resource.find({ postId: post._id })
      const postObj = post.toObject()
      postObj.resources = resources
      return postObj
    })
  )

  // Get total posts count for pagination
  const totalPosts = await Post.countDocuments()
  const totalPages = Math.ceil(totalPosts / limit)
  const hasMore = page < totalPages

  return res.status(200).json(
    new ApiResponse(
      200, 
      {
        posts: postsWithResources,
        pagination: {
          page,
          limit,
          totalPosts,
          totalPages,
          hasMore
        }
      }, 
      "Posts fetched successfully"
    )
  )
})

// Get post by ID
const getPostById = asyncHandler(async (req, res) => {
  const { postId } = req.params

  if (!postId) {
    throw new ApiError(400, "Post ID is required")
  }

  const post = await Post.findById(postId)
    .populate("authorId", "name username profileImage")
    .populate("mentions", "username profileImage")

  if (!post) {
    throw new ApiError(404, "Post not found")
  }

  // Get resources and comments for the post
  const resources = await Resource.find({ postId: post._id })
  const comments = await Comment.find({ postId: post._id })
    .populate("authorId", "name username profileImage")
    .sort({ createdAt: -1 })

  const postObj = post.toObject()
  postObj.resources = resources
  postObj.comments = comments

  return res.status(200).json(
    new ApiResponse(200, postObj, "Post fetched successfully")
  )
})

// Get posts by user with better debugging
const getUserPosts = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  console.log(`Fetching posts for user ID: ${userId}`);
  console.log(`Current user ID from token: ${req.user._id}`);
  
  try {
    // Find posts by this author
    const posts = await Post.find({ authorId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("authorId", "name username profileImage role")
      .populate("mentions", "username profileImage");
    
    console.log(`Found ${posts.length} posts for user ${userId}`);
    
    // Get resources for each post
    const postsWithResources = await Promise.all(
      posts.map(async (post) => {
        const resources = await Resource.find({ postId: post._id });
        console.log(`Post ${post._id} has ${resources.length} resources`);
        const postObj = post.toObject();
        postObj.resources = resources;
        return postObj;
      })
    );
    
    // Get total posts count for pagination
    const totalPosts = await Post.countDocuments({ authorId: userId });
    const totalPages = Math.ceil(totalPosts / limit);
    const hasMore = page < totalPages;

    console.log(`Returning ${postsWithResources.length} posts with resources`);
    
    return res.status(200).json(
      new ApiResponse(
        200, 
        postsWithResources, 
        "User posts fetched successfully"
      )
    );
  } catch (error) {
    console.error(`Error fetching posts for user ${userId}:`, error);
    throw new ApiError(500, `Failed to fetch posts: ${error.message}`);
  }
});

// Update post
const updatePost = asyncHandler(async (req, res) => {
  const { postId } = req.params
  const { content, hashtags, mentions } = req.body

  if (!postId) {
    throw new ApiError(400, "Post ID is required")
  }

  const post = await Post.findById(postId)

  if (!post) {
    throw new ApiError(404, "Post not found")
  }

  // Check if user is the author
  if (post.authorId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this post")
  }

  // Update post
  post.content = content || post.content
  post.hashtags = hashtags ? JSON.parse(hashtags) : post.hashtags
  post.mentions = mentions ? JSON.parse(mentions) : post.mentions

  await post.save()

  return res.status(200).json(
    new ApiResponse(200, post, "Post updated successfully")
  )
})

// Delete post
const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params

  if (!postId) {
    throw new ApiError(400, "Post ID is required")
  }

  const post = await Post.findById(postId)

  if (!post) {
    throw new ApiError(404, "Post not found")
  }

  // Check if user is the author
  if (post.authorId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this post")
  }

  // Delete resources
  const resources = await Resource.find({ postId: post._id })
  
  // Delete resource files if they exist on filesystem
  resources.forEach(resource => {
    if (resource.url && fs.existsSync(resource.url)) {
      fs.unlinkSync(resource.url)
    }
  })
  
  await Resource.deleteMany({ postId: post._id })
  
  // Delete comments
  await Comment.deleteMany({ postId: post._id })
  
  // Delete post
  await Post.findByIdAndDelete(postId)

  return res.status(200).json(
    new ApiResponse(200, {}, "Post deleted successfully")
  )
})

// Like/unlike post
const likeUnlikePost = asyncHandler(async (req, res) => {
  const { postId } = req.params

  if (!postId) {
    throw new ApiError(400, "Post ID is required")
  }

  const post = await Post.findById(postId)

  if (!post) {
    throw new ApiError(404, "Post not found")
  }

  const userIndex = post.likes.findIndex(
    (id) => id.toString() === req.user._id.toString()
  )

  let message = ""

  if (userIndex === -1) {
    // User hasn't liked the post yet, add like
    post.likes.push(req.user._id)
    message = "Post liked successfully"
  } else {
    // User already liked the post, remove like
    post.likes.splice(userIndex, 1)
    message = "Post unliked successfully"
  }

  await post.save()

  return res.status(200).json(
    new ApiResponse(200, post, message)
  )
})

export {
  createPost,
  getAllPosts,
  getPostById,
  getUserPosts,
  updatePost,
  deletePost,
  likeUnlikePost
}