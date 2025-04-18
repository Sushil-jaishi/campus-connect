import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"

async function dbConnect() {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    console.log("database connection success")
  } catch (error) {
    console.log(error)
  }
}

export default dbConnect
