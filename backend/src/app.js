import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import errorHandler from "./middlewares/errorHandler.middleware.js"

const app = express()

const corsOptions = {
  origin: function (origin, callback) {
    // Allow any origin by passing true
    callback(null, true)
  },
  credentials: true,
  optionsSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch(e) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid JSON', 
        statusCode: 400,
        data: null
      });
      throw new Error('Invalid JSON');
    }
  }
}))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(express.static("public"))
app.use(cookieParser())

import userRouter from "./routes/user.routes.js"
import postRouter from "./routes/post.routes.js"
import commentRouter from "./routes/comment.routes.js"
import followRouter from "./routes/follow.routes.js"
import messageRouter from "./routes/message.routes.js"
import resourceRouter from "./routes/resource.routes.js"

app.use("/api/v1/users", userRouter)
app.use("/api/v1/posts", postRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/follows", followRouter)
app.use("/api/v1/messages", messageRouter)
app.use("/api/v1/resources", resourceRouter)

app.use(errorHandler)

export { app }
