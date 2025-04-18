import express from "express"
import cors from "cors"
import dbConnect from "./db/index.js"

const app = express()



dbConnect()
  .then(() => {
    app.use(cors())

    app.get("/", (req, res) => {
      res.send("Hello World")
    })
    app.listen(3000)
  })
  .catch(() => {
    console("database connecction failed")
  })
