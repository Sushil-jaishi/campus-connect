import axios from 'axios';

const API_URL = '/api/v1'; // Using proxy configured in vite.config.js

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Accept': 'application/json'
  }
});

// Add a request interceptor to add the token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    console.log('Request to:', config.url);
    console.log('JWT token available:', token ? 'Yes' : 'No');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No authentication token found for request to:', config.url);
    }
    
    // Add detailed logging for request data
    if (config.data) {
      if (config.data instanceof FormData) {
        console.log('Request data is FormData:', Array.from(config.data.entries()));
      } else {
        console.log('Request data:', config.data);
      }
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token refresh and log JSON parsing errors
api.interceptors.response.use(
  (response) => {
    console.log('Response from:', response.config.url, 'Status:', response.status);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Check specifically for JSON parsing errors
    if (error.message && error.message.includes('JSON')) {
      console.error('JSON PARSING ERROR:', error.message);
      console.error('Response data:', error.response?.data);
      console.error('Original request URL:', originalRequest?.url);
      console.error('Original request method:', originalRequest?.method);
      return Promise.reject(new Error('There was a problem parsing the server response. Please try again.'));
    }
    
    // If the error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Attempt to refresh the token
        const response = await axios.post(`${API_URL}/users/refresh-token`, {}, {
          withCredentials: true
        });
        
        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
        
        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh token is invalid, redirect to login with better error message
        localStorage.removeItem('accessToken');
        
        // Store a user-friendly error message in session storage
        sessionStorage.setItem('loginError', 'Your session has expired. Please sign in again to continue.');
        
        // Redirect to login page
        window.location.href = '/login';
        
        return Promise.reject(new Error('Your session has expired. Please sign in again to continue.'));
      }
    }
    
    // Handle token invalid or token expired errors with a better error message
    if (error.response?.status === 403) {
      if (error.response.data?.message?.includes('Token invalid') || 
          error.response.data?.message?.includes('expired')) {
        // Clear invalid token
        localStorage.removeItem('accessToken');
        
        // Store user-friendly error message
        sessionStorage.setItem('loginError', 'Your session has expired. Please sign in again to continue.');
        
        // Only redirect if not already on the login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        
        return Promise.reject(new Error('Your session has expired. Please sign in again to continue.'));
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  register: (userData) => api.post('/users/register', userData),
  login: (credentials) => api.post('/users/login', credentials),
  logout: () => api.post('/users/logout'),
  getCurrentUser: () => api.get('/users/profile'),
  getUserProfile: (userId) => api.get(`/users/profile/${userId}`),
  updateProfile: (userData) => api.patch('/users/update-profile', userData),
  changePassword: (passwords) => api.post('/users/change-password', passwords)
};

// User services
export const userService = {
  searchUsers: (query) => api.get(`/users/search?query=${encodeURIComponent(query)}`),
  getUserById: (userId) => api.get(`/users/${userId}`)
};

// Admin services
export const adminService = {
  getAllUsers: (page = 1, limit = 10) => api.get(`/users/admin/users?page=${page}&limit=${limit}`),
  changeUserRole: (userId, role) => api.patch(`/users/admin/users/${userId}/role`, { role }),
};

// Add a safe response handler to ensure consistent response structure
const handleResponse = (response) => {
  if (!response || !response.data) {
    return { data: { data: [] } };
  }
  if (!response.data.data && response.data.data !== null) {
    response.data.data = [];
  }
  return response;
};

// Post services
export const postService = {
  createPost: async (postData) => {
    console.log('Creating post with data:', postData);
    try {
      let formData;
      
      if (postData instanceof FormData) {
        formData = postData;
        console.log('Using provided FormData for post creation');
      } else {
        // Convert regular object to FormData to match backend expectations
        formData = new FormData();
        console.log('Converting object to FormData for post creation');
        for (const key in postData) {
          if (postData[key] !== undefined && postData[key] !== null) {
            formData.append(key, postData[key]);
            console.log(`Added ${key} to FormData:`, postData[key]);
          }
        }
      }
      
      // Log the final FormData content before sending
      console.log('Final FormData entries:', Array.from(formData.entries()));
      
      // Use specific config for FormData to ensure correct content-type
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      };
      
      const response = await api.post('/posts', formData, config);
      console.log('Post creation response:', response);
      return response;
    } catch (error) {
      console.error('Error in createPost:', error);
      
      if (error.message && error.message.includes('JSON')) {
        console.error('JSON parsing error in createPost response');
      }
      
      if (error.response) {
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
        try {
          console.error('Error response data:', error.response.data);
        } catch (parseError) {
          console.error('Could not parse error response data:', parseError);
        }
      } else if (error.request) {
        console.error('No response received for request:', error.request);
      }
      
      throw error;
    }
  },
  getAllPosts: async () => {
    try {
      const response = await api.get('/posts');
      console.log('Posts response:', response);
      
      // The backend returns posts inside a nested object structure:
      // { data: { data: { posts: [...], pagination: {...} } } }
      if (response?.data?.data?.posts) {
        // Extract just the posts array
        return { 
          data: { 
            data: response.data.data.posts 
          } 
        };
      }
      return handleResponse(response);
    } catch (error) {
      console.error('Error in getAllPosts:', error);
      return { data: { data: [] } };
    }
  },
  getPostById: (id) => api.get(`/posts/${id}`),
  getUserPosts: async (userId) => {
    try {
      console.log(`API call: Getting posts for user ${userId}`);
      const response = await api.get(`/posts/user/${userId}`);
      console.log(`API response for user ${userId} posts:`, response);
      
      // Return the response as is, we'll handle the format in the component
      return response;
    } catch (error) {
      console.error(`Error fetching posts for user ${userId}:`, error);
      return { data: { data: [] } };
    }
  },
  updatePost: (id, postData) => api.patch(`/posts/${id}`, postData),
  deletePost: (id) => api.delete(`/posts/${id}`),
  likeUnlikePost: (id) => api.post(`/posts/${id}/like`)
};

// Comment services
export const commentService = {
  createComment: (commentData) => api.post('/comments', commentData),
  getPostComments: (postId) => api.get(`/comments/post/${postId}`),
  updateComment: (id, content) => api.patch(`/comments/${id}`, { content }),
  deleteComment: (id) => api.delete(`/comments/${id}`)
};

// Follow services
export const followService = {
  followUser: (userId) => api.post(`/follows/${userId}`),
  unfollowUser: (userId) => api.delete(`/follows/${userId}`),
  getFollowing: (userId) => api.get(userId ? `/follows/following/${userId}` : '/follows/following'),
  getFollowers: (userId) => api.get(userId ? `/follows/followers/${userId}` : '/follows/followers'),
  checkFollowStatus: (targetUserId) => api.get(`/follows/status/${targetUserId}`)
};

// Message services
export const messageService = {
  sendMessage: (messageData) => api.post('/messages', messageData),
  getAllConversations: () => api.get('/messages/conversations'),
  getConversation: (userId) => api.get(`/messages/conversation/${userId}`),
  deleteMessage: (id) => api.delete(`/messages/${id}`)
};

// Resource services
export const resourceService = {
  addResource: (resourceData) => api.post('/resources', resourceData),
  getPostResources: async (postId) => {
    if (!postId) {
      console.error('Cannot fetch resources: postId is undefined');
      return { data: { data: [] } };
    }
    try {
      console.log(`Fetching resources for post: ${postId}`);
      const response = await api.get(`/resources/post/${postId}`);
      console.log(`Resources response for post ${postId}:`, response);
      
      // Check if we got valid data
      if (response && response.data && response.data.data) {
        const resources = response.data.data;
        console.log(`Successfully retrieved ${resources.length} resources for post ${postId}`);
        
        // Log each resource for debugging
        resources.forEach((resource, index) => {
          console.log(`Resource ${index + 1} for post ${postId}:`, {
            id: resource._id,
            type: resource.type,
            url: resource.url,
            title: resource.title
          });
        });
      }
      
      return handleResponse(response);
    } catch (error) {
      console.error(`Error fetching resources for post ${postId}:`, error);
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      return { data: { data: [] } };
    }
  },
  deleteResource: (id) => api.delete(`/resources/${id}`),
  updateResourceTitle: (id, title) => api.patch(`/resources/${id}/title`, { title })
}; 