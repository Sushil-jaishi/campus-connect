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
app.use(express.json())
app.use(express.urlencoded())
app.use(express.static("public"))
app.use(cookieParser())

import userRouter from "./routes/user.routes.js"
app.use("/api/v1/users", userRouter)

app.use(errorHandler)

export { app }
