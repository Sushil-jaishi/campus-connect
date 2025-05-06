# Social Media API

A RESTful API for a social media platform built with Node.js, Express, and MongoDB.

## Features

- User authentication (register, login, logout)
- JWT-based authentication with access and refresh tokens
- Post creation, updating, and deletion
- Like/unlike posts
- Follow/unfollow users
- Comment on posts
- Direct messaging between users
- Resource management (images, PDFs) for posts

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- Multer for file uploads
- Cloudinary for file storage

## API Endpoints

### Authentication

- `POST /api/v1/users/register` - Register a new user
- `POST /api/v1/users/login` - Login a user
- `POST /api/v1/users/logout` - Logout a user
- `POST /api/v1/users/refresh-token` - Refresh access token

### Users

- `GET /api/v1/users/profile` - Get current user profile
- `PATCH /api/v1/users/update-profile` - Update user profile
- `POST /api/v1/users/change-password` - Change password

### Posts

- `POST /api/v1/posts` - Create a new post
- `GET /api/v1/posts` - Get all posts
- `GET /api/v1/posts/:postId` - Get a specific post
- `GET /api/v1/posts/user/:userId` - Get all posts by a user
- `PATCH /api/v1/posts/:postId` - Update a post
- `DELETE /api/v1/posts/:postId` - Delete a post
- `POST /api/v1/posts/:postId/like` - Like/unlike a post

### Comments

- `POST /api/v1/comments` - Create a comment
- `GET /api/v1/comments/post/:postId` - Get all comments on a post
- `PATCH /api/v1/comments/:commentId` - Update a comment
- `DELETE /api/v1/comments/:commentId` - Delete a comment

### Follows

- `POST /api/v1/follows/:userId` - Follow a user
- `DELETE /api/v1/follows/:userId` - Unfollow a user
- `GET /api/v1/follows/following/:userId?` - Get users that a user is following
- `GET /api/v1/follows/followers/:userId?` - Get followers of a user
- `GET /api/v1/follows/status/:targetUserId` - Check follow status

### Messages

- `POST /api/v1/messages` - Send a message
- `GET /api/v1/messages/conversations` - Get all conversations
- `GET /api/v1/messages/conversation/:userId` - Get conversation with a user
- `DELETE /api/v1/messages/:messageId` - Delete a message

### Resources

- `POST /api/v1/resources` - Add a resource to a post
- `GET /api/v1/resources/post/:postId` - Get all resources for a post
- `DELETE /api/v1/resources/:resourceId` - Delete a resource
- `PATCH /api/v1/resources/:resourceId/title` - Update resource title

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example`
4. Start the server: `npm start`

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=8000
MONGODB_URI=mongodb://localhost:27017/db1
CORS_ORIGIN=http://localhost:3000

# JWT Settings
ACCESS_TOKEN_SECRET=your_access_token_secret_here
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here
REFRESH_TOKEN_EXPIRY=10d

# Cloudinary Settings
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## Development

Start the development server with nodemon:

```
npm run dev
``` 