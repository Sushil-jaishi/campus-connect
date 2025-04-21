import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"

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
  const { name, email, password, username } = req.body

  if ([name, email, password, username].some((field) => field.trim() === "")) {
    throw new ApiError(400, `${field} should be provided`)
  }

  const emailExist = await User.findOne({ $or: [{ username }, { email }] })
  if (emailExist) {
    throw new ApiError(409, "Username or Email is already taken")
  }

  const user = await User.create({
    name,
    email,
    password,
    username,
  })
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if (!createdUser) {
    throw new ApiError(500, "We're sorry, the user couldn't created")
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

export { registerUser, loginUser, logoutUser }
