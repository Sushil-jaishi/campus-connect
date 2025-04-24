import mongoose from "mongoose"

const resourceSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    type: {
      type: String,
      enum: ["image", "pdf"],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    title: {
      type: String,
    },
  },
  { timestamps: true }
)

export const Resource = mongoose.model("Resource", resourceSchema)
