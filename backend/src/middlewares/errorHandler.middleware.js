import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"

function errorHandler(err, req, res, next) {
  // Enhanced error logging
  console.error(`
    ERROR: ${err.name || 'Unknown Error'} 
    MESSAGE: ${err.message || 'No message'} 
    URL: ${req.originalUrl}
    METHOD: ${req.method}
    BODY: ${JSON.stringify(req.body)}
  `)
  
  // Handle specific error types
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors || [],
      data: null
    })
  }
  
  // Handle SyntaxError (JSON parsing errors)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: "Invalid JSON in request body",
      errors: [err.message],
      data: null
    })
  }
  
  // Handle other errors
  return res.status(500).json({
    success: false,
    statusCode: 500,
    message: err.message || "Internal Server Error",
    errors: [],
    data: null
  })
}

export default errorHandler
