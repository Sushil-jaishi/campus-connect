import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { postService, commentService, resourceService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Post = ({ post, onUpdate }) => {
  const { currentUser } = useAuth();
  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentCount, setCommentCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [postResources, setPostResources] = useState([]);

  // Check if the current user has liked this post
  const hasUserLikedPost = () => {
    if (!post.likes || !currentUser) return false;
    return post.likes.some(id => id === currentUser._id);
  };

  // Log the post data for debugging
  useEffect(() => {
    console.log('Post data received:', post);
    console.log('Post resources:', post.resources);
    
    // Check if we already have resources loaded
    if (post.resources && post.resources.length > 0) {
      console.log(`Post ${post._id} already has ${post.resources.length} resources`);
      // If we already have resources in the post prop, clear any local resources
      if (postResources.length > 0) {
        setPostResources([]);
      }
    } 
    // Check if resources should be fetched separately
    else if (post._id && (!post.resources || post.resources.length === 0)) {
      const fetchPostResources = async () => {
        try {
          console.log(`Fetching resources directly for post ${post._id}`);
          const response = await resourceService.getPostResources(post._id);
          const resources = response.data.data || [];
          console.log(`Found ${resources.length} resources for post ${post._id}:`, resources);
          if (resources.length > 0) {
            setPostResources(resources);
          }
        } catch (error) {
          console.error(`Error fetching resources for post ${post._id}:`, error);
        }
      };
      
      fetchPostResources();
    }
  }, [post, post._id, post.resources]);

  // Function to fetch comment count and optionally comments
  const fetchComments = useCallback(async (loadFull = false) => {
    try {
      const response = await commentService.getPostComments(post._id);
      const fetchedComments = response.data.data || [];
      setCommentCount(fetchedComments.length);
      
      if (loadFull) {
        setComments(fetchedComments);
      }
      return fetchedComments;
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }, [post._id]);

  // Fetch the comment count when the component mounts
  useEffect(() => {
    fetchComments(false);
  }, [fetchComments]);

  // Format image URL
  const formatImageUrl = (path) => {
    if (!path) return "https://placehold.co/150"; // Default placeholder
    
    // If path is already a full URL
    if (path.startsWith('http')) return path;
    
    // Base URL for images
    const baseUrl = 'http://localhost:8000';
    
    // Replace backslashes with forward slashes (for Windows paths)
    let formattedPath = path.replace(/\\/g, '/');
    
    // If path is a relative server path starting with public
    if (formattedPath.startsWith('public/')) {
      formattedPath = formattedPath.replace('public/', '/');
    }
    
    // If path starts with ./public/, replace it with /
    if (formattedPath.startsWith('./public/')) {
      formattedPath = formattedPath.replace('./public/', '/');
    }
    
    // If path doesn't start with a slash, add it
    if (!formattedPath.startsWith('/')) {
      formattedPath = `/${formattedPath}`;
    }
    
    console.log('Formatted URL:', `${baseUrl}${formattedPath}`);
    return `${baseUrl}${formattedPath}`;
  };

  // Generic function to format text content with hashtags and mentions
  const formatContent = (content, mentionedUsers = []) => {
    if (!content) return null;
    
    // This regex will match hashtags and mentions including any punctuation at the end
    const regex = /(#\w+|@\w+)([.,!?;:])?/g;
    
    // Split content into parts that match the regex and parts that don't
    const parts = content.split(regex).filter(Boolean);
    
    return (
      <>
        {parts.map((part, index) => {
          // If part is a hashtag
          if (part.startsWith('#')) {
            return (
              <span key={index} className="text-blue-600 font-medium hover:underline">
                {part}
              </span>
            );
          }
          // If part is a mention
          else if (part.startsWith('@')) {
            const username = part.substring(1); // Remove the @ symbol
            
            // Try to find in mentions array (populated data)
            const mentionedUser = mentionedUsers.find(user => 
              user.username === username
            );
            
            if (mentionedUser && mentionedUser._id) {
              return (
                <Link 
                  key={index}
                  to={`/profile/${mentionedUser._id}`}
                  className="text-purple-600 font-medium hover:underline"
                >
                  {part}
                </Link>
              );
            }
            
            // If user object not found or not populated, still highlight it
            return (
              <span key={index} className="text-purple-600 font-medium">
                {part}
              </span>
            );
          }
          // If part is punctuation or regular text
          else {
            return <span key={index}>{part}</span>;
          }
        })}
      </>
    );
  };

  // Format post content using the generic formatter with post mentions
  const formatPostContent = (content) => {
    return formatContent(content, post.mentions || []);
  };

  // Handle liking/unliking posts
  const handleLike = async () => {
    if (isLiking) return;
    
    setIsLiking(true);
    
    // Store original likes for rollback if needed
    const originalLikes = [...(post.likes || [])];
    
    // Optimistically update the UI
    const userIndex = post.likes ? post.likes.findIndex(id => id === currentUser._id) : -1;
    
    // Create a local copy of the post to update
    const updatedPost = { ...post };
    
    if (userIndex === -1) {
      // User hasn't liked the post yet, add like
      updatedPost.likes = [...(post.likes || []), currentUser._id];
    } else {
      // User already liked the post, remove like
      updatedPost.likes = post.likes.filter(id => id !== currentUser._id);
    }
    
    // Update the post in the parent component
    if (onUpdate) {
      // Pass the updated post to avoid a full reload
      onUpdate(updatedPost);
    }
    
    try {
      // Send request to server
      await postService.likeUnlikePost(post._id);
    } catch (error) {
      console.error('Error liking post:', error);
      
      // Revert to original state on error
      if (onUpdate) {
        post.likes = originalLikes;
        onUpdate(post);
      }
    } finally {
      setIsLiking(false);
    }
  };

  // Toggle comments display
  const handleToggleComments = async () => {
    const newShowComments = !showComments;
    setShowComments(newShowComments);
    
    if (newShowComments && comments.length === 0) {
      setLoadingComments(true);
      try {
        await fetchComments(true);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  // Optimistically update the UI when adding a comment
  const addComment = (newCommentItem) => {
    // Update the comments list
    setComments(prevComments => [newCommentItem, ...prevComments]);
    
    // Update the comment count
    setCommentCount(prevCount => prevCount + 1);
  };
  
  // Handle comment submission
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmittingComment) return;
    
    const commentContent = newComment;
    setIsSubmittingComment(true);
    
    // Clear the input immediately for better UX
    setNewComment('');
    
    try {
      // Create the temporary comment object for optimistic UI update
      const tempComment = {
        _id: 'temp-' + Date.now(),
        postId: post._id,
        content: commentContent,
        authorId: currentUser,
        createdAt: new Date().toISOString(),
        pending: true
      };
      
      // Optimistically add to the UI
      addComment(tempComment);
      
      // Send to the server
      const response = await commentService.createComment({
        postId: post._id,
        content: commentContent
      });
      
      // Replace the temp comment with the real one
      const actualComment = response.data.data;
      setComments(prevComments => 
        prevComments.map(comment => 
          comment._id === tempComment._id ? actualComment : comment
        )
      );
    } catch (error) {
      console.error('Error submitting comment:', error);
      // Remove the temp comment on error
      setComments(prevComments => 
        prevComments.filter(comment => comment._id !== 'temp-' + Date.now())
      );
      setCommentCount(prevCount => Math.max(0, prevCount - 1));
      alert('Failed to post comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get combined resources from both post prop and local state
  const getResources = useCallback(() => {
    if (post.resources && post.resources.length > 0) {
      return post.resources;
    }
    return postResources;
  }, [post.resources, postResources]);

  // Get resources for rendering
  const resources = getResources();

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 hover:shadow-xl transition-shadow duration-300">
      {/* Post Header */}
      <div className="flex items-center p-5 bg-gray-50 border-b border-gray-100">
        {post.authorId && (
          <>
            <Link to={`/profile/${post.authorId._id}`}>
              <img 
                src={post.authorId.profileImage ? formatImageUrl(post.authorId.profileImage) : "https://placehold.co/150"} 
                alt={post.authorId.username || 'User'} 
                className="w-12 h-12 rounded-full mr-4 object-cover border-2 border-blue-100"
                onError={(e) => {
                  console.error(`Failed to load profile image for user ${post.authorId._id}`);
                  e.target.src = "https://placehold.co/150";
                }}
              />
            </Link>
            <div>
              <Link to={`/profile/${post.authorId._id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                {post.authorId.username || 'Anonymous User'}
              </Link>
              <p className="text-gray-500 text-xs">{formatDate(post.createdAt)}</p>
            </div>
          </>
        )}
      </div>

      {/* Post Content */}
      <div className="px-5 py-4 bg-white">
        {/* Post Text Content */}
        <p className="text-gray-800 mb-5 leading-relaxed">{formatPostContent(post.content)}</p>
        
        {/* Post Images/Resources (if any) */}
        {resources && resources.length > 0 && (
          <div className="mb-5">
            <div className={`${resources.length === 1 ? 'w-full' : 'grid grid-cols-2 gap-3'}`}>
              {resources.map((resource) => (
                <div key={resource._id} className="relative mb-3">
                  {resource.type === 'image' ? (
                    <div className="relative overflow-hidden rounded-lg">
                      <img 
                        src={formatImageUrl(resource.url)} 
                        alt={resource.title || 'Post attachment'} 
                        className="w-full object-cover rounded-lg border border-gray-200 shadow-sm"
                        style={{ 
                          height: resources.length === 1 ? '320px' : '200px',
                          width: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          console.error(`Failed to load image for resource ${resource._id}`);
                          e.target.src = "https://placehold.co/600x400?text=Image+Not+Available";
                        }}
                      />
                      {resource.title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm truncate">
                          {resource.title}
                        </div>
                      )}
                    </div>
                  ) : (
                    <a 
                      href={formatImageUrl(resource.url)} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200 shadow-sm p-4 h-48 hover:bg-gray-100 transition-colors"
                      style={{ width: '100%' }}
                    >
                      <div className="text-center">
                        <div className="text-5xl mb-3">📄</div>
                        <span className="font-medium text-blue-600 block mb-1">{resource.title || 'PDF Document'}</span>
                        <p className="text-xs text-gray-500 mt-1">Click to open</p>
                      </div>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
        
      {/* Post Actions */}
      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-blue-50 to-white border-t border-gray-100">
        <button 
          onClick={handleLike}
          className={`flex items-center space-x-2 px-3 py-2 rounded-full ${hasUserLikedPost() ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-white'} transition-colors`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={hasUserLikedPost() ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={hasUserLikedPost() ? 0 : 1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span>{post.likes?.length || 0} Likes</span>
        </button>
        
        <button 
          onClick={handleToggleComments}
          className={`flex items-center space-x-2 px-3 py-2 rounded-full ${showComments ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-white'} transition-colors`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{commentCount} Comments</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="p-5 bg-gray-100">
          {/* Comment Form */}
          <form onSubmit={handleCommentSubmit} className="mb-5">
            <div className="flex items-center">
              <input
                type="text"
                placeholder="Add a comment..."
                className="flex-grow p-3 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !newComment.trim()}
                className="bg-blue-600 text-white px-5 py-3 rounded-r-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
              >
                {isSubmittingComment ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>

          {/* Comments List */}
          {loadingComments ? (
            <div className="text-center py-5">
              <div className="loading-spinner mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-5 text-gray-500">No comments yet. Be the first to comment!</div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment._id} className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-2">
                    <Link to={`/profile/${comment.authorId._id}`}>
                      <img 
                        src={comment.authorId.profileImage ? formatImageUrl(comment.authorId.profileImage) : "https://placehold.co/150"} 
                        alt={comment.authorId.username || 'User'} 
                        className="w-10 h-10 rounded-full mr-3 object-cover border-2 border-blue-100"
                        onError={(e) => {
                          console.error(`Failed to load comment author profile image`);
                          e.target.src = "https://placehold.co/150";
                        }}
                      />
                    </Link>
                    <div>
                      <Link to={`/profile/${comment.authorId._id}`} className="font-medium text-gray-900 text-sm hover:text-blue-600 transition-colors">
                        {comment.authorId.username}
                      </Link>
                      <span className="text-gray-500 text-xs ml-2">{formatDate(comment.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-gray-800 text-sm ml-13">{formatContent(comment.content, post.mentions)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 