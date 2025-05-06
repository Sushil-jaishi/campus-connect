import mongoose from "mongoose"

const followSchema = new mongoose.Schema(
  {
    followerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    followingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
)

// Creating a compound index to ensure a user can't follow the same person twice
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true })

export const Follow = mongoose.model("Follow", followSchema)
