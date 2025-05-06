import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { postService, resourceService, userService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const CreatePost = () => {
  const [newPost, setNewPost] = useState('');
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [hashtags, setHashtags] = useState([]);
  const [mentions, setMentions] = useState([]);
  const [mentionSearchResults, setMentionSearchResults] = useState([]);
  const [showMentionsList, setShowMentionsList] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not logged in
    if (!currentUser) {
      navigate('/login');
    }
    
    // Clean up preview URLs when component unmounts
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url.url));
    };
  }, [currentUser, navigate, previewUrls]);

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
    
    return `${baseUrl}${formattedPath}`;
  };

  const handlePostChange = (e) => {
    const content = e.target.value;
    setNewPost(content);
    setCursorPosition(e.target.selectionStart);
    
    // Extract hashtags (words starting with #)
    const hashtagRegex = /#(\w+)/g;
    const extractedHashtags = [];
    let match;
    
    while ((match = hashtagRegex.exec(content)) !== null) {
      if (!extractedHashtags.includes(match[1])) {
        extractedHashtags.push(match[1]);
      }
    }
    
    setHashtags(extractedHashtags);
    
    // Check for mention being typed
    const lastAtSymbolPos = content.lastIndexOf('@', cursorPosition);
    const spaceAfterAt = content.indexOf(' ', lastAtSymbolPos);
    const endPos = spaceAfterAt > -1 ? spaceAfterAt : content.length;
    
    if (lastAtSymbolPos > -1 && 
        (lastAtSymbolPos === 0 || content[lastAtSymbolPos - 1] === ' ') && 
        cursorPosition > lastAtSymbolPos && 
        cursorPosition <= endPos) {
      
      const currentMentionSearch = content.substring(lastAtSymbolPos + 1, cursorPosition);
      setMentionSearchTerm(currentMentionSearch);
      
      if (currentMentionSearch.length > 0) {
        searchUsers(currentMentionSearch);
        setShowMentionsList(true);
      } else {
        setShowMentionsList(false);
      }
    } else {
      setShowMentionsList(false);
    }
    
    // We no longer automatically extract mentions here
    // Mentions will only be added when a user is clicked from the dropdown
  };
  
  const searchUsers = async (query) => {
    if (query.length < 1) return;
    
    try {
      setMentionSearchResults([]); // Clear previous results
      
      // Show searching state
      const response = await userService.searchUsers(query);
      
      if (response && response.data && response.data.data) {
        const users = response.data.data;
        console.log(`Found ${users.length} users matching '${query}'`);
        
        if (users.length === 0 && query.length >= 3) {
          // If no users found after typing at least 3 characters, show a message
          console.log("No users found matching the search term");
        } else {
          setMentionSearchResults(users);
        }
      }
    } catch (error) {
      console.error("Error searching users:", error);
      setMentionSearchResults([]);
    }
  };
  
  const insertMention = (username, userId) => {
    const beforeCursor = newPost.substring(0, cursorPosition);
    const atIndex = beforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const start = newPost.substring(0, atIndex);
      const end = newPost.substring(cursorPosition);
      const updatedPost = `${start}@${username} ${end}`;
      
      setNewPost(updatedPost);
      setShowMentionsList(false);
      
      // Add to mentions array if not already there
      if (!mentions.includes(username)) {
        setMentions([...mentions, username]);
        
        // Store the user ID and username for later reference
        console.log(`Added mention for user: ${username} (${userId})`);
      }
    }
  };

  const removeMention = (usernameToRemove) => {
    // Filter out the username from mentions array
    const updatedMentions = mentions.filter(username => username !== usernameToRemove);
    setMentions(updatedMentions);
    
    // Also remove the @username from the post content
    const mentionPattern = new RegExp(`@${usernameToRemove}\\s?`, 'g');
    const updatedContent = newPost.replace(mentionPattern, '');
    setNewPost(updatedContent);
    
    console.log(`Removed mention: @${usernameToRemove}`);
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
      console.log("Hashtags:", hashtags);
      console.log("Mentions:", mentions);
      
      // Create FormData for the post with enhanced logging
      const postFormData = new FormData();
      postFormData.append('content', newPost);
      
      // Add hashtags and mentions as JSON strings
      if (hashtags.length > 0) {
        postFormData.append('hashtags', JSON.stringify(hashtags));
        console.log("Added hashtags to FormData:", JSON.stringify(hashtags));
      }
      
      if (mentions.length > 0) {
        postFormData.append('mentions', JSON.stringify(mentions));
        console.log("Added mentions to FormData:", JSON.stringify(mentions));
      }
      
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
      
      // Set success message
      setSuccessMessage("Post created successfully!");
      
      // Reset the form
      setNewPost('');
      setFiles([]);
      setPreviewUrls([]);
      setHashtags([]);
      setMentions([]);
      
      // Redirect to home after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
      
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

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className="py-8">
        <h1 className="text-3xl font-bold mb-8 text-center text-blue-600">Create Post</h1>
        
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100 transition-shadow hover:shadow-xl">
          <form onSubmit={handleSubmit}>
            <div className="flex items-start mb-5 relative">
              <img 
                src={currentUser?.profileImage ? formatImageUrl(currentUser.profileImage) : "https://placehold.co/150"} 
                alt={currentUser?.username || "User"} 
                className="w-12 h-12 rounded-full mr-4 object-cover border-2 border-blue-100 shadow-sm"
                onError={(e) => {
                  console.error('Failed to load current user profile image');
                  e.target.src = "https://placehold.co/150";
                }}
              />
              <div className="w-full relative">
                <textarea
                  className="w-full p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all resize-none"
                  placeholder="Share your knowledge or ask a question... Use #hashtags and @mentions"
                  rows="5"
                  value={newPost}
                  onChange={handlePostChange}
                ></textarea>
                
                {/* Mention suggestions dropdown */}
                {showMentionsList && (
                  <div className="absolute z-10 left-0 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                    {mentionSearchResults.length > 0 ? (
                      <>
                        <div className="px-4 py-2 bg-gray-100 border-b text-xs text-gray-600 font-medium">
                          Click on a user to mention them in your post
                        </div>
                        <ul>
                          {mentionSearchResults.map(user => (
                            <li 
                              key={user._id} 
                              className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-center"
                              onClick={() => insertMention(user.username, user._id)}
                              onMouseDown={(e) => {
                                // Allow Ctrl/Cmd+click to open profile in new tab
                                if (e.ctrlKey || e.metaKey) {
                                  e.preventDefault();
                                  window.open(`/profile/${user._id}`, '_blank');
                                  return;
                                }
                              }}
                            >
                              <img 
                                src={user.profileImage ? formatImageUrl(user.profileImage) : "https://placehold.co/150"} 
                                alt={user.username} 
                                className="w-8 h-8 rounded-full mr-2 object-cover"
                              />
                              <div>
                                <span className="font-medium">@{user.username}</span>
                                {user.name && <span className="text-sm text-gray-500 ml-1">({user.name})</span>}
                              </div>
                              <div className="ml-auto text-xs text-blue-600">
                                Click to mention
                              </div>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <div className="p-4 text-gray-500 text-sm">
                        {mentionSearchTerm.length < 2 ? 
                          "Type more characters to search for users..." : 
                          "No users found matching your search. You can only mention existing users."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Display detected hashtags and mentions */}
            <div className="mb-4">
              {hashtags.length > 0 && (
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-500">Hashtags: </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {hashtags.map((tag, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {mentions.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Mentions: </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {mentions.map((username, index) => (
                      <span 
                        key={index} 
                        className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center group cursor-pointer hover:bg-purple-200"
                        onClick={() => removeMention(username)}
                        title="Click to remove this mention"
                      >
                        @{username}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 opacity-70 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Click on a mention to remove it</p>
                </div>
              )}
            </div>
            
            {/* File Preview Section */}
            {previewUrls.length > 0 && (
              <div className={`${previewUrls.length === 1 ? 'w-full' : 'grid grid-cols-3 gap-3'} mb-5`}>
                {previewUrls.map((preview, index) => (
                  <div key={index} className="relative">
                    {preview.type === 'image' ? (
                      <div className="relative rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                        <img 
                          src={preview.url} 
                          alt={`Preview ${index}`} 
                          className="w-full object-cover rounded-lg"
                          style={{ 
                            height: previewUrls.length === 1 ? '400px' : '200px',
                            width: '100%',
                            objectFit: 'cover'
                          }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-xs truncate">
                          {preview.file.name}
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                          aria-label="Remove file"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="relative h-48 w-full bg-gray-50 border border-gray-200 rounded-lg shadow-sm flex items-center justify-center overflow-hidden">
                        <div className="text-center p-3">
                          <div className="text-3xl mb-2">📄</div>
                          <span className="text-sm font-medium text-blue-600 block mt-1 truncate w-full max-w-[180px]">
                            {preview.file.name}
                          </span>
                          <span className="text-xs text-gray-500 mt-1 block">PDF Document</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                          aria-label="Remove file"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between border-t pt-4">
              <label className="flex items-center gap-2 text-blue-500 cursor-pointer hover:text-blue-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">Add Photos/Files</span>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*,application/pdf" 
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={files.length >= 5 || isSubmitting}
                />
              </label>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={(!newPost.trim() && files.length === 0) || isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-300 transition-colors shadow-sm"
                >
                  {isSubmitting ? 'Posting...' : 'Share'}
                </button>
              </div>
            </div>
          </form>
        </div>
        
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
      </div>
    </div>
  );
}; 