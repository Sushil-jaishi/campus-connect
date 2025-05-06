import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import fs from "fs"

const cookieOptions = {
  httpOnly: true,
  secure: true,
}

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })
    return { accessToken, refreshToken }
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token",
      error
    )
  }
}

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, name, email, password, username } = req.body
  
  // Use either fullName or name field
  const userName = name || fullName

  // Validate required fields
  if (!userName) {
    throw new ApiError(400, "Name is required")
  }
  if (!email) {
    throw new ApiError(400, "Email is required")
  }
  if (!password) {
    throw new ApiError(400, "Password is required")
  }
  if (!username) {
    throw new ApiError(400, "Username is required")
  }

  // Check if email or username already exists
  const existingUser = await User.findOne({ $or: [{ username }, { email }] })
  if (existingUser) {
    throw new ApiError(409, "Username or Email is already taken")
  }

  // Create user
  const user = await User.create({
    name: userName,
    email,
    password,
    username,
  })
  
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if (!createdUser) {
    throw new ApiError(500, "We're sorry, the user couldn't be created")
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User is registered Successfully"))
})

const loginUser = asyncHandler(async (req, res) => {
  if (!req.body || !req.body.email || !req.body.password) {
    throw new ApiError(400, "email and password is required")
  }

  const { email, password } = req.body

  const user = await User.findOne({ email })

  if (!user) {
    throw new ApiError(404, "user doesn't exist")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)
  if (!isPasswordValid) {
    throw new ApiError(401, "the password is incorrect")
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  )

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user logged in successfully"
      )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: true,
      },
    },
    {
      new: true,
    }
  )
  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "user logged out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incommingRefreshToken =
      req.cookies?.refreshToken || req.body.refreshToken

    if (!incommingRefreshToken) {
      throw new ApiError(401, "Refresh token missing")
    }

    const decodedToken = jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRETE
    )
    const user = await User.findById(decodedToken._id)

    if (!user || incommingRefreshToken !== user?.refreshToken) {
      throw new ApiError(403, "invalid refresh token")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    )

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access Token Refreshed"
        )
      )
  } catch (error) {
    throw new ApiError(403, "Token invalid or expired")
  }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body

  const user = await User.findById(req.user?._id)

  if (!user) {
    throw new ApiError(404, "User not found")
  }
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if (!isPasswordCorrect) {
    throw new ApiError(401, "the password is incorrect")
  }

  user.password = newPassword
  console.log(user.password)
  await user.save({ validateBeforeSave: false })

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})

const updateUserProfile = asyncHandler(async (req, res) => {
  let { name, email, bio } = req.body
  let profileImage = req.file?.path

  if (!name && !email && !bio && !profileImage) {
    throw new ApiError(400, "At least one field should be provided")
  }

  if (email && email !== req.user.email) {
    const existingUser = await User.findOne({ email })
    if (existingUser && existingUser._id !== req.user._id) {
      throw new ApiError(409, "Email is already in use by another account")
    }
  }

  name = name || req.user.name
  email = email || req.user.email
  bio = bio || req.user.bio
  profileImage = profileImage || req.user.profileImage

  const oldProfileImage = req.user.profileImage

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        name,
        email,
        bio,
        profileImage,
      },
    },
    { new: true }
  ).select("-password -refreshToken")

  if (profileImage && oldProfileImage && fs.existsSync(oldProfileImage)) {
    fs.unlink(oldProfileImage, (err) => {
      if (err) console.error("Failed to delete old profile image:", err)
    })
  }

  res.status(200).json(new ApiResponse(200, user, "User updated successfully"))
})

const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params
  
  if (!userId) {
    throw new ApiError(400, "User ID is required")
  }

  const user = await User.findById(userId).select("-password -refreshToken")
  
  if (!user) {
    throw new ApiError(404, "User not found")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully"))
})

const changeUserRole = asyncHandler(async (req, res) => {
  // Check if the current user is an admin
  if (req.user.role !== "Admin") {
    throw new ApiError(403, "Only administrators can change user roles")
  }

  const { userId } = req.params
  const { role } = req.body
  
  if (!userId) {
    throw new ApiError(400, "User ID is required")
  }
  
  if (!role) {
    throw new ApiError(400, "Role is required")
  }
  
  // Validate the role is one of the allowed roles
  const allowedRoles = ["Student", "Admin", "Mentor"]
  if (!allowedRoles.includes(role)) {
    throw new ApiError(400, `Role must be one of: ${allowedRoles.join(", ")}`)
  }
  
  // Don't allow changing own role (security measure)
  if (userId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot change your own role")
  }

  const user = await User.findById(userId)
  
  if (!user) {
    throw new ApiError(404, "User not found")
  }
  
  // Update the user's role
  user.role = role
  await user.save()
  
  return res
    .status(200)
    .json(new ApiResponse(200, 
      { userId: user._id, username: user.username, role: user.role }, 
      `User role updated to ${role} successfully`
    ))
})

const getAllUsers = asyncHandler(async (req, res) => {
  // Only admins can see all users
  if (req.user.role !== "Admin") {
    throw new ApiError(403, "Only administrators can access all users")
  }
  
  // Implement pagination
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const skip = (page - 1) * limit
  
  // Get users with pagination, excluding sensitive fields
  const users = await User.find()
    .select("-password -refreshToken")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })  // Most recent first
  
  // Get total count for pagination
  const totalUsers = await User.countDocuments()
  
  return res
    .status(200)
    .json(new ApiResponse(200, {
      users,
      pagination: {
        totalUsers,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        pageSize: limit
      }
    }, "Users fetched successfully"))
})

const searchUsers = asyncHandler(async (req, res) => {
  const { query } = req.query;
  
  if (!query || query.trim() === '') {
    throw new ApiError(400, "Search query is required");
  }
  
  // Search for users with similar username or name
  const users = await User.find({
    $or: [
      { username: { $regex: query, $options: 'i' } },
      { name: { $regex: query, $options: 'i' } }
    ]
  })
  .select("_id username name profileImage") // Only return necessary fields
  .limit(10); // Limit to 10 results
  
  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully"));
});

export {
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
}
