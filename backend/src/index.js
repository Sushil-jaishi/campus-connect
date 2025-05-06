import dbConnect from "./db/index.js"
import { app } from "./app.js"

dbConnect()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`http://127.0.0.1:${process.env.PORT}`)
    })
  })
  .catch((error) => {
    console.log("database connecction failed", error)
  })
