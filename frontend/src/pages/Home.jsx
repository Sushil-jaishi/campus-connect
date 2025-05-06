import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../components/Post';
import { postService, resourceService, followService, userService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Home = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [newPost, setNewPost] = useState('');
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchPosts();
    fetchSuggestions();
  }, []);

  useEffect(() => {
    // Clean up preview URLs when component unmounts
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url.url));
    };
  }, [previewUrls]);

  // Log posts when they change
  useEffect(() => {
    console.log("Posts state updated:", posts);
    // Check if posts have resources
    if (posts.length > 0) {
      posts.forEach(post => {
        console.log(`Post ${post._id} has ${post.resources ? post.resources.length : 0} resources`);
      });
    }
  }, [posts]);

  // Format image URL - same implementation as in Post component
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

  const fetchSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      // Get users who follow the current user
      const followers = await followService.getFollowers();
      const followersList = followers.data.data || [];
      
      // Get users the current user follows
      const following = await followService.getFollowing();
      const followingList = following.data.data || [];
      
      // Create a map of following users by ID for faster lookups
      const followingMap = new Map();
      followingList.forEach(user => followingMap.set(user._id, user));
      
      // 1. Find followers who aren't followed back
      const followersNotFollowed = followersList.filter(follower => 
        !followingMap.has(follower._id)
      );
      
      // 2. Get followers of followers (for users you may know)
      const followersOfFollowers = [];
      for (const following of followingList.slice(0, 3)) { // Limit to avoid too many requests
        try {
          const theirFollowers = await followService.getFollowers(following._id);
          if (theirFollowers.data.data) {
            // Only add people you don't already follow
            theirFollowers.data.data.forEach(user => {
              if (!followingMap.has(user._id) && user._id !== currentUser._id) {
                followersOfFollowers.push({
                  ...user,
                  connection: `Followed by @${following.username}`
                });
              }
            });
          }
        } catch (err) {
          console.error(`Error fetching followers for ${following.username}:`, err);
        }
      }

      // Combine and limit suggestions
      const combinedSuggestions = [
        ...followersNotFollowed.map(user => ({
          ...user,
          connection: 'Follows you'
        })),
        ...followersOfFollowers
      ];
      
      // Remove duplicates (using Set + map trick) and limit to 5
      const uniqueSuggestions = Array.from(
        new Map(combinedSuggestions.map(item => [item._id, item])).values()
      ).slice(0, 5);
      
      setSuggestions(uniqueSuggestions);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Handle follow user action
  const handleFollow = async (userId) => {
    try {
      await followService.followUser(userId);
      // Update suggestions list by removing the followed user
      setSuggestions(suggestions.filter(user => user._id !== userId));
    } catch (err) {
      console.error('Error following user:', err);
    }
  };

  const fetchPosts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Fetching posts...");
      const response = await postService.getAllPosts();
      console.log("Full posts response:", response);
      
      // Ensure posts is always an array
      const postsData = response.data.data || [];
      console.log("Posts data extracted:", postsData);
      
      if (Array.isArray(postsData)) {
        console.log(`Setting ${postsData.length} posts`);
        
        // Check if posts have resources and if not, fetch them separately
        const postsWithResources = await Promise.all(postsData.map(async (post) => {
          // If post already has resources array but it's empty, or doesn't have resources property
          if (!post.resources || post.resources.length === 0) {
            console.log(`Fetching resources for post: ${post._id}`);
            try {
              const resourcesResponse = await resourceService.getPostResources(post._id);
              const resources = resourcesResponse.data.data || [];
              console.log(`Found ${resources.length} resources for post ${post._id}:`, resources);
              return { ...post, resources };
            } catch (error) {
              console.error(`Error fetching resources for post ${post._id}:`, error);
              return { ...post, resources: [] };
            }
          }
          return post;
        }));
        
        console.log("Posts with resources:", postsWithResources);
        setPosts(postsWithResources);
      } else {
        console.error("Posts data is not an array:", postsData);
        setPosts([]);
      }
    } catch (err) {
      setError('Failed to load posts. Please try again later.');
      console.error('Error fetching posts:', err);
      // Set posts to empty array on error
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostChange = (e) => {
    setNewPost(e.target.value);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Limit to 5 files
    const filesToAdd = selectedFiles.slice(0, 5 - files.length);
    
    if (filesToAdd.length > 0) {
      setFiles([...files, ...filesToAdd]);
      
      // Create preview URLs for the files
      const newPreviewUrls = filesToAdd.map(file => ({
        file,
        url: URL.createObjectURL(file),
        type: file.type.startsWith('image/') ? 'image' : 'pdf'
      }));
      
      setPreviewUrls([...previewUrls, ...newPreviewUrls]);
    }
  };

  const removeFile = (index) => {
    const newFiles = [...files];
    const newPreviewUrls = [...previewUrls];
    
    // Revoke the URL to free memory
    URL.revokeObjectURL(previewUrls[index].url);
    
    newFiles.splice(index, 1);
    newPreviewUrls.splice(index, 1);
    
    setFiles(newFiles);
    setPreviewUrls(newPreviewUrls);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && files.length === 0) return;
    
    setIsSubmitting(true);
    setError(null); // Clear any previous errors
    setSuccessMessage(null); // Clear any previous success message
    
    try {
      console.log("Attempting to create post with content:", newPost);
      
      // Create FormData for the post with enhanced logging
      const postFormData = new FormData();
      postFormData.append('content', newPost);
      console.log("FormData created with content:", newPost);
      
      // First create the post using FormData with better error handling
      console.log("Sending post creation request...");
      let postResponse;
      try {
        postResponse = await postService.createPost(postFormData);
        console.log("Post creation response received:", postResponse);
      } catch (postError) {
        console.error("Post creation failed:", postError);
        if (postError.message && postError.message.includes('JSON')) {
          throw new Error('Server returned invalid response format. Please try again later.');
        }
        throw postError;
      }
      
      if (!postResponse || !postResponse.data) {
        throw new Error('Invalid response received from server');
      }
      
      const createdPost = postResponse.data.data;
      const postId = createdPost._id;
      
      if (!postId) {
        console.error("Post ID missing in response:", postResponse);
        throw new Error('Could not get post ID from server response');
      }
      
      console.log("Post created successfully with ID:", postId);
      
      // Then upload any files as resources
      const uploadedResources = [];
      if (files.length > 0) {
        console.log(`Uploading ${files.length} files for post:`, postId);
        
        for (const file of files) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('postId', postId);
          formData.append('type', file.type.startsWith('image/') ? 'image' : 'pdf');
          formData.append('title', file.name);
          
          console.log("Uploading file:", file.name, "to post:", postId);
          try {
            const resourceResponse = await resourceService.addResource(formData);
            console.log("File upload response:", resourceResponse);
            // Add the uploaded resource to our local list
            if (resourceResponse && resourceResponse.data && resourceResponse.data.data) {
              uploadedResources.push(resourceResponse.data.data);
            }
          } catch (resourceError) {
            console.error("File upload failed:", resourceError);
            // Continue with other files even if one fails
          }
        }
      }
      
      // Immediately add the post to the UI for a better user experience
      const newCreatedPost = {
        ...createdPost,
        resources: uploadedResources, // Add the uploaded resources
        authorId: currentUser, // Use current user data
      };
      
      // Add the new post to the top of the list
      setPosts(prevPosts => [newCreatedPost, ...prevPosts]);
      
      // Refresh posts to ensure we have the latest data
      fetchPosts();
      
      // Set success message
      setSuccessMessage("Post created successfully!");
      
      // Reset the form
      setNewPost('');
      setFiles([]);
      setPreviewUrls([]);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Error creating post:', err);
      
      // Enhanced error logging
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Error response data:", err.response.data);
        console.error("Error response status:", err.response.status);
        console.error("Error response headers:", err.response.headers);
        
        setError(err.response?.data?.message || `Server error ${err.response.status}: ${err.message}`);
      } else if (err.request) {
        // The request was made but no response was received
        console.error("Error request:", err.request);
        setError('No response from server. Please check your connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Error message:", err.message);
        setError('Failed to create post: ' + err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostUpdate = (updatedPost) => {
    // If we receive an updated post object, just update that specific post
    if (updatedPost) {
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post._id === updatedPost._id ? updatedPost : post
        )
      );
    } else {
      // If no specific post provided, fetch all posts (legacy behavior)
      fetchPosts();
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 flex">
      {/* Main Content - Posts */}
      <div className="w-full md:w-2/3 py-6 pr-0 md:pr-6">
        
        {/* Success Message */}
        {successMessage && (
          <div 
            className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-lg mb-6 shadow-sm"
            style={{
              animation: 'fadeIn 0.3s ease-in-out',
            }}
          >
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <p className="font-medium">{successMessage}</p>
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 shadow-sm">
            <p className="font-medium">{error}</p>
          </div>
        )}
        
        {/* Posts List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading contributions...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <p className="text-gray-600 font-medium">No contributions yet. Be the first to share your knowledge!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.isArray(posts) ? posts.map(post => (
              <Post key={post._id} post={post} onUpdate={handlePostUpdate} />
            )) : (
              <div className="text-center py-12 bg-white rounded-xl shadow-md">
                <p className="text-gray-600 font-medium">Error loading contributions.</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Suggestions Section */}
      <div className="hidden md:block md:w-1/3 py-6 pl-4">
        <div className="bg-white rounded-xl shadow-md p-4 sticky top-20">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">People You May Know</h3>
          
          {isLoadingSuggestions ? (
            <div className="flex justify-center py-4">
              <div className="loading-spinner"></div>
            </div>
          ) : suggestions.length === 0 ? (
            <p className="text-gray-500 text-sm py-2">No new suggestions right now.</p>
          ) : (
            <div className="space-y-4">
              {suggestions.map(user => (
                <div key={user._id} className="flex items-center">
                  <Link to={`/profile/${user._id}`} className="flex-shrink-0">
                    <img 
                      src={formatImageUrl(user.profileImage)} 
                      alt={user.username} 
                      className="w-12 h-12 rounded-full object-cover border border-gray-200"
                      onError={(e) => {
                        e.target.src = "https://placehold.co/150";
                      }}
                    />
                  </Link>
                  <div className="ml-3 flex-grow min-w-0">
                    <Link to={`/profile/${user._id}`} className="font-medium text-gray-900 hover:text-blue-600 block truncate">
                      @{user.username}
                    </Link>
                    <p className="text-xs text-gray-500 truncate">{user.connection}</p>
                  </div>
                  <button 
                    onClick={() => handleFollow(user._id)}
                    className="ml-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded-full transition-colors"
                  >
                    Follow
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 