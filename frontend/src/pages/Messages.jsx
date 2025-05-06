import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { messageService, authService, followService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const Messages = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [following, setFollowing] = useState([]);
  const [filteredFollowing, setFilteredFollowing] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
    fetchFollowing();
  }, []);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.user._id);
    }
  }, [activeConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Filter following list based on search term
    if (searchTerm.trim() === '') {
      setFilteredFollowing([]);
    } else {
      const filtered = following.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredFollowing(filtered);
    }
  }, [searchTerm, following]);

  // Show typing indicator for a brief moment when sending a message
  useEffect(() => {
    let typingTimeout;
    
    if (isSending) {
      setIsTyping(true);
      
      // Clear the typing indicator after the message is sent plus a small delay
      typingTimeout = setTimeout(() => {
        setIsTyping(false);
      }, 2000); // Keep typing indicator for 2 seconds after sending
    }
    
    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [isSending]);

  // Function to format image URL - similar to the one in Profile.jsx
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

  const fetchFollowing = async () => {
    try {
      const response = await followService.getFollowing();
      if (response && response.data && response.data.data) {
        setFollowing(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching following list:', err);
      setError('Could not load following list. You can only message users you follow.');
    }
  };

  const fetchConversations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await messageService.getAllConversations();
      setConversations(response.data.data);
      
      // If there are conversations, set the first one as active
      if (response.data.data.length > 0) {
        setActiveConversation(response.data.data[0]);
      }
    } catch (err) {
      setError('Failed to load conversations');
      console.error('Error fetching conversations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (userId) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await messageService.getConversation(userId);
      setMessages(response.data.data);
    } catch (err) {
      setError('Failed to load messages');
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || isSending) return;
    
    setIsSending(true);
    const messageContent = newMessage;
    setNewMessage(''); // Clear input field immediately for better UX
    
    try {
      const response = await messageService.sendMessage({
        receiverId: activeConversation.user._id,
        message: messageContent
      });
      
      // Use a small delay to simulate the typing indicator experience
      setTimeout(() => {
        // Add the new message to the list
        setMessages([...messages, response.data.data]);
        
        // Update last message in conversations list
        const updatedConversations = conversations.map(conv => {
          if (conv.user._id === activeConversation.user._id) {
            return {
              ...conv,
              latestMessage: response.data.data
            };
          }
          return conv;
        });
        
        setConversations(updatedConversations);
        setIsSending(false);
      }, 1500); // Simulate a 1.5 second delay to show typing indicator
      
    } catch (err) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await messageService.deleteMessage(messageId);
      
      // Remove the message from the list
      setMessages(messages.filter(msg => msg._id !== messageId));
      
      // If it's the latest message, update the conversation list
      if (activeConversation.latestMessage?._id === messageId) {
        const newLatestMessage = messages.filter(msg => msg._id !== messageId).pop();
        
        const updatedConversations = conversations.map(conv => {
          if (conv.user._id === activeConversation.user._id) {
            return {
              ...conv,
              latestMessage: newLatestMessage
            };
          }
          return conv;
        });
        
        setConversations(updatedConversations);
        setActiveConversation({
          ...activeConversation,
          latestMessage: newLatestMessage
        });
      }
    } catch (err) {
      setError('Failed to delete message');
      console.error('Error deleting message:', err);
    }
  };

  const startConversation = async (user) => {
    setIsSearching(true);
    
    try {
      // Check if conversation already exists
      const existingConv = conversations.find(conv => conv.user._id === user._id);
      
      if (existingConv) {
        setActiveConversation(existingConv);
      } else {
        // Create new conversation object
        const newConv = {
          user: user,
          latestMessage: null
        };
        
        setActiveConversation(newConv);
        setConversations([newConv, ...conversations]);
      }
      
      // Reset search
      setSearchTerm('');
      setFilteredFollowing([]);
      setShowNewConversation(false);
    } catch (err) {
      setError('Failed to start conversation');
      console.error('Error starting conversation:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (isLoading && !activeConversation) {
    return (
      <div className="text-center py-10">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <p className="mt-2 text-gray-600">Loading conversations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col overflow-hidden">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between items-center animate-fadeIn">
          <span>{error}</span>
          <button 
            className="ml-4 text-red-700 font-bold hover:text-red-900 transition-colors"
            onClick={() => setError(null)}
          >
            &times;
          </button>
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden bg-white rounded-lg shadow-lg">
        {/* Conversations Sidebar */}
        <div className={`w-1/3 border-r border-gray-200 conversation-sidebar ${showNewConversation ? 'hidden md:block' : ''}`}>
          <div className="p-4 bg-white flex justify-between items-center shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800">Messages</h2>
            <button 
              onClick={() => setShowNewConversation(!showNewConversation)}
              className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-full transition-colors"
              title={showNewConversation ? "Close new message" : "New message"}
            >
              {showNewConversation ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
          </div>
          
          {showNewConversation && (
            <div className="p-4 bg-white shadow-sm animate-fadeIn">
              <h3 className="text-sm font-semibold mb-3 text-gray-700 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Start a New Conversation
              </h3>
              <div className="relative mb-3">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by name or username"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 p-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                />
              </div>
              
              {/* Search Results */}
              {filteredFollowing.length > 0 && (
                <div className="max-h-52 overflow-y-auto border rounded-lg shadow-sm messages-scroll">
                  {filteredFollowing.map(user => (
                    <div 
                      key={user._id} 
                      className="flex items-center p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0 transition-colors animate-fadeIn"
                      onClick={() => startConversation(user)}
                    >
                      <img 
                        src={user.profileImage ? formatImageUrl(user.profileImage) : "https://placehold.co/150"} 
                        alt={user.username || 'User'} 
                        className="w-10 h-10 rounded-full mr-3 object-cover border border-gray-200"
                        onError={(e) => {
                          e.target.src = "https://placehold.co/150";
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-800">@{user.username}</p>
                        <p className="text-xs text-gray-500">{user.fullName || user.name}</p>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-700 py-1 px-2 rounded-full">Message</span>
                    </div>
                  ))}
                </div>
              )}
              
              {searchTerm && filteredFollowing.length === 0 && (
                <div className="text-sm text-gray-500 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center animate-fadeIn">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  No matching users found.
                </div>
              )}
              
              {!searchTerm && (
                <p className="text-xs text-gray-500 mt-1 italic">
                  You can only message users you follow. Start typing to find someone.
                </p>
              )}
            </div>
          )}
          
          <div className="overflow-y-auto flex-grow messages-scroll">
            {conversations.length === 0 ? (
              <div className="text-center py-10 text-gray-500 flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>No conversations yet</p>
                <button 
                  onClick={() => setShowNewConversation(true)}
                  className="mt-3 text-sm text-blue-500 hover:text-blue-700 font-medium"
                >
                  Start a conversation
                </button>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div 
                  key={conversation.user._id}
                  className={`flex items-center p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0 transition-colors ${
                    activeConversation && activeConversation.user._id === conversation.user._id ? 'active-conversation' : ''
                  }`}
                  onClick={() => setActiveConversation(conversation)}
                >
                  <div className="relative">
                    <img 
                      src={conversation.user.profileImage ? formatImageUrl(conversation.user.profileImage) : "https://placehold.co/150"} 
                      alt={conversation.user.username} 
                      className="w-12 h-12 rounded-full mr-3 object-cover border-2 border-gray-200"
                      onError={(e) => {
                        console.error(`Failed to load conversation profile image`);
                        e.target.src = "https://placehold.co/150";
                      }}
                    />
                    <span className="absolute bottom-0 right-2 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium truncate text-gray-800">@{conversation.user.username}</h3>
                      {conversation.latestMessage && (
                        <span className="text-xs text-gray-500 ml-2">
                          {formatTime(conversation.latestMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    
                    {conversation.latestMessage && (
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.latestMessage.senderId === currentUser._id ? (
                          <span className="text-gray-400 font-light">You: </span>
                        ) : null}
                        {conversation.latestMessage.message}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Messages Area */}
        <div className={`flex-1 flex flex-col ${showNewConversation ? 'w-full' : 'hidden md:flex'} messages-content`}>
          {activeConversation ? (
            <>
              {/* Conversation Header */}
              <div className="p-4 bg-white flex items-center shadow-sm">
                <Link to={`/profile/${activeConversation.user._id}`} className="relative">
                  <img 
                    src={activeConversation.user.profileImage ? formatImageUrl(activeConversation.user.profileImage) : "https://placehold.co/150"} 
                    alt={activeConversation.user.username} 
                    className="w-10 h-10 rounded-full mr-3 object-cover border-2 border-gray-200"
                    onError={(e) => {
                      console.error(`Failed to load active conversation profile image`);
                      e.target.src = "https://placehold.co/150";
                    }}
                  />
                  <span className="absolute bottom-0 right-2 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                </Link>
                <div>
                  <Link to={`/profile/${activeConversation.user._id}`} className="font-semibold text-gray-800 hover:text-blue-600 transition-colors">
                    @{activeConversation.user.username}
                  </Link>
                  <p className="text-xs text-gray-500">{activeConversation.user.fullName || activeConversation.user.name}</p>
                </div>
                <Link to={`/profile/${activeConversation.user._id}`} className="ml-auto text-sm text-blue-500 hover:text-blue-700 transition-colors">
                  View Profile
                </Link>
              </div>
              
              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-100 messages-scroll">
                {isLoading ? (
                  <div className="text-center py-10 message-loading">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
                    <p className="mt-2 text-gray-600 text-sm">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 flex flex-col items-center no-messages-placeholder">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-lg">No messages yet</p>
                    <p className="text-sm mt-1">Send a message to start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => {
                      const isCurrentUser = message.senderId === currentUser._id;
                      return (
                        <div 
                          key={message._id} 
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-[75%] relative group ${
                              isCurrentUser 
                                ? 'message-bubble-out' 
                                : 'message-bubble-in'
                            }`}
                          >
                            <p className="break-words">{message.message}</p>
                            <span className="message-timestamp">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
              
              {/* Message Input */}
              <div className="message-input-container">
                <form onSubmit={handleSendMessage} className="flex items-center">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 p-3 bg-white border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="p-3 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition-colors"
                    disabled={!newMessage.trim()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center p-6 max-w-md no-messages-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Your Messages</h3>
                <p className="text-gray-500 mb-4">Select a conversation or start a new one to begin messaging</p>
                <button 
                  onClick={() => setShowNewConversation(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
                >
                  Start a New Conversation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 