import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Post } from '../components/Post';
import { useAuth } from '../context/AuthContext';
import { postService, followService, authService } from '../services/api';

export const Profile = () => {
  const { userId } = useParams();
  const { currentUser } = useAuth();
  
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);
  
  const isOwnProfile = !userId || (currentUser && userId === currentUser._id);
  const displayUserId = userId || (currentUser?._id);

  useEffect(() => {
    if (displayUserId) {
      fetchUserData();
    }
  }, [displayUserId]);
  
  const fetchUserData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First get the user profile directly
      if (isOwnProfile) {
        setProfileUser(currentUser);
        console.log("Using current user data for profile:", currentUser);
      } else {
        try {
          const userResponse = await authService.getUserProfile(displayUserId);
          setProfileUser(userResponse.data.data);
          console.log("Fetched profile data for user:", userResponse.data.data);
        } catch (profileError) {
          console.error('Error fetching user profile:', profileError);
          // If direct user profile fetch fails, we'll try to get it from posts as fallback
        }
      }
      
      // Fetch user posts
      console.log(`Fetching posts for user ID: ${displayUserId}`);
      const postsResponse = await postService.getUserPosts(displayUserId);
      console.log("Posts response:", postsResponse);
      
      // Handle multiple possible response formats
      let postsData;
      if (postsResponse?.data?.data?.posts) {
        // If response has the format: { data: { data: { posts: [...] } } }
        postsData = postsResponse.data.data.posts;
        console.log("Found posts in nested posts array:", postsData.length);
      } else if (Array.isArray(postsResponse?.data?.data)) {
        // If response has the format: { data: { data: [...] } }
        postsData = postsResponse.data.data;
        console.log("Found posts in data array:", postsData.length);
      } else {
        // Fallback to empty array
        postsData = [];
        console.log("No posts found in response, using empty array");
      }
      
      // Safety check
      if (!Array.isArray(postsData)) {
        console.error("Posts data is not an array:", postsData);
        postsData = [];
      }
      
      console.log(`Setting ${postsData.length} posts:`, postsData);
      setPosts(postsData);
      
      // If we still don't have the profile user and have posts, get it from the first post
      if (!profileUser && !isOwnProfile && postsData.length > 0) {
        setProfileUser(postsData[0].authorId);
        console.log("Using author from first post for profile:", postsData[0].authorId);
      }
      
      // Check if current user is following this user
      if (!isOwnProfile && currentUser) {
        const followStatusResponse = await followService.checkFollowStatus(displayUserId);
        setIsFollowing(followStatusResponse.data.data.isFollowing);
      }
      
      // Fetch followers and following
      const followersResponse = await followService.getFollowers(displayUserId);
      const followingResponse = await followService.getFollowing(displayUserId);
      
      setFollowers(followersResponse.data.data || []);
      setFollowing(followingResponse.data.data || []);
    } catch (err) {
      setError('Failed to load profile data. Please try again later.');
      console.error('Error fetching profile data:', err);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFollow = async () => {
    if (followLoading) return;
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await followService.unfollowUser(displayUserId);
      } else {
        await followService.followUser(displayUserId);
      }
      
      // Refresh follow status and followers
      const followStatusResponse = await followService.checkFollowStatus(displayUserId);
      setIsFollowing(followStatusResponse.data.data.isFollowing);
      
      const followersResponse = await followService.getFollowers(displayUserId);
      setFollowers(followersResponse.data.data);
    } catch (err) {
      console.error('Error following/unfollowing user:', err);
    } finally {
      setFollowLoading(false);
    }
  };
  
  const handlePostUpdate = (updatedPost) => {
    // If we receive an updated post object, just update that specific post in the posts array
    if (updatedPost) {
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post._id === updatedPost._id ? updatedPost : post
        )
      );
    } else {
      // If no specific post provided, fetch all user data (legacy behavior)
      fetchUserData();
    }
  };

  // Function to format image URL - updated to match other components
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

  if (isLoading) {
    return (
      <div className="text-center py-10">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <p className="mt-2 text-gray-600">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="text-center py-10 bg-white rounded-lg shadow-md">
        <p className="text-gray-600">User not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Profile Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-8 hover-card">
        <div className="flex flex-col sm:flex-row items-center">
          <div className="relative mb-6 sm:mb-0 sm:mr-8">
            <div className="w-32 h-32 rounded-full ring-4 ring-blue-100 overflow-hidden shadow-xl">
              <img 
                src={profileUser.profileImage ? formatImageUrl(profileUser.profileImage) : "https://placehold.co/150"} 
                alt={profileUser.username || 'User'} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error(`Failed to load profile image for user`);
                  e.target.src = "https://placehold.co/150";
                }}
              />
            </div>
            {profileUser.role && (
              <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-blue-800 text-white text-xs font-semibold px-4 py-1 rounded-full shadow-md">
                {profileUser.role}
              </span>
            )}
          </div>
          
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{profileUser.fullName || profileUser.name}</h1>
            <p className="text-blue-600 text-lg mb-4 font-medium">@{profileUser.username}</p>
            
            {profileUser.bio && (
              <p className="text-gray-600 mb-6 max-w-2xl leading-relaxed">{profileUser.bio}</p>
            )}
            
            <div className="flex flex-wrap justify-center sm:justify-start gap-8">
              <div className="bg-blue-50 rounded-xl px-6 py-3 shadow-sm hover:shadow transition-all">
                <span className="block text-lg font-bold text-gray-900 mb-1">{Array.isArray(posts) ? posts.length : 0}</span>
                <span className="text-blue-600 font-medium text-sm">Contributions</span>
              </div>
              <div className="bg-blue-50 rounded-xl px-6 py-3 shadow-sm hover:shadow transition-all">
                <span className="block text-lg font-bold text-gray-900 mb-1">{Array.isArray(followers) ? followers.length : 0}</span>
                <span className="text-blue-600 font-medium text-sm">Followers</span>
              </div>
              <div className="bg-blue-50 rounded-xl px-6 py-3 shadow-sm hover:shadow transition-all">
                <span className="block text-lg font-bold text-gray-900 mb-1">{Array.isArray(following) ? following.length : 0}</span>
                <span className="text-blue-600 font-medium text-sm">Following</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 sm:mt-0 sm:ml-6">
            {!isOwnProfile && currentUser && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`px-8 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isFollowing 
                    ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' 
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg'
                }`}
              >
                {followLoading ? (
                  <div className="flex items-center">
                    <div className="loading-spinner mr-2"></div>
                    Loading...
                  </div>
                ) : isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            )}
            
            {isOwnProfile && (
              <Link
                to="/settings"
                className="inline-flex items-center px-8 py-3 bg-gray-100 text-gray-800 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden hover-card">
        <div className="flex gap-1 p-1">
          <button
            className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-200 rounded-xl ${
              activeTab === 'posts' 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm' 
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50/50'
            }`}
            onClick={() => setActiveTab('posts')}
          >
            Contributions
          </button>
          <button
            className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-200 rounded-xl ${
              activeTab === 'followers' 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm' 
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50/50'
            }`}
            onClick={() => setActiveTab('followers')}
          >
            Followers
          </button>
          <button
            className={`flex-1 py-4 px-6 text-center font-medium transition-all duration-200 rounded-xl ${
              activeTab === 'following' 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-sm' 
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50/50'
            }`}
            onClick={() => setActiveTab('following')}
          >
            Following
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="space-y-4">
        {/* Posts Tab */}
        {activeTab === 'posts' && (
          Array.isArray(posts) && posts.length === 0 ? (
            <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover-card">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 text-lg mb-4">No contributions yet.</p>
              {isOwnProfile && (
                <Link
                  to="/create-post"
                  className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <span className="text-white">Create Your First Post</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Array.isArray(posts) ? posts.map(post => (
                <Post key={post._id} post={post} onUpdate={handlePostUpdate} />
              )) : (
                <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg">
                  <p className="text-gray-600">Error loading contributions.</p>
                </div>
              )}
            </div>
          )
        )}
        
        {/* Followers Tab */}
        {activeTab === 'followers' && (
          Array.isArray(followers) && followers.length === 0 ? (
            <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover-card">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-600 text-lg">No followers yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.isArray(followers) ? followers.map(user => (
                <div key={user._id} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] hover-card">
                  <Link to={`/profile/${user._id}`} className="flex items-center">
                    <div className="relative">
                      <img 
                        src={user.profileImage ? formatImageUrl(user.profileImage) : "https://placehold.co/150"} 
                        alt={user.username || 'User'} 
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-blue-100"
                        onError={(e) => {
                          console.error(`Failed to load follower profile image`);
                          e.target.src = "https://placehold.co/150";
                        }}
                      />
                      {user.role && (
                        <span className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                          {user.role}
                        </span>
                      )}
                    </div>
                    <div className="ml-4">
                      <p className="font-semibold text-gray-900">@{user.username}</p>
                      <p className="text-sm text-gray-600">{user.fullName || user.name}</p>
                    </div>
                  </Link>
                </div>
              )) : (
                <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg col-span-2">
                  <p className="text-gray-600">Error loading followers.</p>
                </div>
              )}
            </div>
          )
        )}
        
        {/* Following Tab */}
        {activeTab === 'following' && (
          Array.isArray(following) && following.length === 0 ? (
            <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover-card">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-600 text-lg">Not following anyone yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.isArray(following) ? following.map(user => (
                <div key={user._id} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] hover-card">
                  <Link to={`/profile/${user._id}`} className="flex items-center">
                    <div className="relative">
                      <img 
                        src={user.profileImage ? formatImageUrl(user.profileImage) : "https://placehold.co/150"} 
                        alt={user.username || 'User'} 
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-blue-100"
                        onError={(e) => {
                          console.error(`Failed to load following profile image`);
                          e.target.src = "https://placehold.co/150";
                        }}
                      />
                      {user.role && (
                        <span className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                          {user.role}
                        </span>
                      )}
                    </div>
                    <div className="ml-4">
                      <p className="font-semibold text-gray-900">@{user.username}</p>
                      <p className="text-sm text-gray-600">{user.fullName || user.name}</p>
                    </div>
                  </Link>
                </div>
              )) : (
                <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg col-span-2">
                  <p className="text-gray-600">Error loading following.</p>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}; 