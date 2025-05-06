import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Add CSS for animations
const styles = {
  '@keyframes fadeIn': {
    from: { opacity: 0 },
    to: { opacity: 1 }
  }
};

export const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [renderKey, setRenderKey] = useState(0); // Force re-render when needed
  
  const { login, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef(null);

  // Check for success message in URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const registrationSuccess = params.get('registrationSuccess');
    
    if (registrationSuccess === 'true') {
      setSuccessMessage('Account created successfully! Please log in.');
    }
    
    // Check for stored error messages on component mount
    const storedError = sessionStorage.getItem('loginError');
    if (storedError) {
      console.log('Found stored error message:', storedError);
      setFormError(storedError);
      // Don't clear it automatically - let the user interaction clear it
    }
  }, []);

  // Watch auth context errors and copy them to local state
  useEffect(() => {
    if (authError) {
      console.log('Auth context error detected:', authError);
      setFormError(authError);
      setRenderKey(prev => prev + 1); // Force a re-render
    }
  }, [authError]);

  // Use useEffect to ensure error message has time to be seen
  useEffect(() => {
    if (formError) {
      // Scroll to the error message
      window.scrollTo(0, 0);
      
      // Log for debugging
      console.log('Error message set in component state:', formError);
      
      // Do NOT clear the error message automatically
      // This ensures it stays visible until the user takes action
    }
  }, [formError]);
  
  // Clear error message only when user interacts with the form again
  useEffect(() => {
    if (formData.email || formData.password) {
      // Only clear error when the user starts typing again
      if (formError) {
        console.log("User interaction detected, clearing previous error");
      }
    }
  }, [formData.email, formData.password]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Clear error when user starts modifying the form
    if (formError) {
      console.log("Clearing error message due to user input");
      setFormError(''); // Clear the error when user starts typing
      sessionStorage.removeItem('loginError'); // Remove from session storage too
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Create a custom submission handler that intentionally skips normal form submission
  const handleLoginClick = async () => {
    // Keep previous error messages until we know the outcome
    // Only clear success messages
    setSuccessMessage('');
    setIsSubmitting(true);
    
    console.log("Login button clicked - handling manually");
    
    // Basic client-side validation
    if (!formData.email.trim()) {
      setFormError('Please enter your email address.');
      setIsSubmitting(false);
      console.log("Email validation failed");
      return;
    }
    
    if (!formData.password.trim()) {
      setFormError('Please enter your password.');
      setIsSubmitting(false);
      console.log("Password validation failed");
      return;
    }
    
    try {
      console.log('Attempting login with:', { email: formData.email });
      
      // The actual login request
      const result = await login({
        email: formData.email,
        password: formData.password
      });
      
      console.log('Login successful, navigating to home', result);
      navigate('/');
    } catch (error) {
      console.error("LOGIN ERROR CAUGHT:", error);
      console.error("Error type:", typeof error);
      console.error("Error stack:", error.stack);
      
      // Force error message to appear - make sure it's set
      let errorMsg = 'Login failed. Please check your credentials and try again.';
      
      if (error.message) {
        errorMsg = error.message;
        console.log("Using error.message:", errorMsg);
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
        console.log("Using error.response.data.message:", errorMsg);
      }
      
      console.log('Setting form error directly:', errorMsg);
      
      // Set the error and force component update
      setFormError(errorMsg);
      
      // Force a re-render with key to ensure the component gets updated
      setRenderKey(prev => prev + 1);
      
      // Store error in session storage for persistence across minor refreshes
      sessionStorage.setItem('loginError', errorMsg);
      
      // Log additional details for debugging
      console.log('Form error state after error:', errorMsg);
      console.log('Form state:', formData);
      console.log('Is error message visible?', !!errorMsg);
      
      // Wait a moment to ensure state updates before continuing
      setTimeout(() => {
        console.log('Delayed check - Form error:', formError);
        console.log('Is error still visible?', !!formError);
      }, 500);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Only used to prevent default form submission
  const handleSubmit = (e) => {
    console.log("Form submit intercepted and prevented");
    e.preventDefault();
    return false;
  };

  return (
    <div className="w-full flex justify-center items-center py-12 px-4 sm:px-6 lg:px-8" key={renderKey}>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: .8;
            }
          }
        `}
      </style>
      <div className="w-full max-w-xl bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Welcome Back</h2>
          <p className="text-gray-600 mb-8">Sign in to your account to continue</p>
        </div>
        
        {!!formError && (
          <div 
            className={`border-l-4 p-4 mb-6 rounded-md shadow-md flex items-start ${
              formError.includes('INCORRECT_PASSWORD') 
                ? 'bg-red-100 border-red-600 text-red-800 animate-pulse'
                : 'bg-red-100 border-red-500 text-red-700'
            }`}
            style={{ 
              animation: 'fadeIn 0.3s ease-out',
              position: 'relative'
            }}
          >
            <svg className="h-6 w-6 mr-3 mt-0.5 flex-shrink-0 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-grow">
              <p className="font-bold text-red-600">Login Error</p>
              <p className="text-sm mt-1">
                {formError.includes('INCORRECT_PASSWORD') 
                  ? formError.replace('INCORRECT_PASSWORD:', '').trim()
                  : formError}
              </p>
              {formError.includes("password") && (
                <p className="text-xs mt-2">
                  Please make sure you've entered the correct password.
                </p>
              )}
              {formError.toLowerCase().includes("user") && formError.toLowerCase().includes("not found") && (
                <p className="text-xs mt-2">
                  If you don't have an account, please register first.
                </p>
              )}
            </div>
            <button 
              onClick={() => {
                setFormError('');
                sessionStorage.removeItem('loginError');
              }}
              className="absolute top-2 right-2 text-red-500 hover:text-red-700"
              aria-label="Close error message"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded">
            <p>{successMessage}</p>
          </div>
        )}
        
        {/* Use div instead of form to prevent form submission behavior */}
        <div className="space-y-6" ref={formRef}>
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="email">
              Email Address
            </label>
            <input
              className={`appearance-none block w-full px-3 py-3 border ${
                formError.toLowerCase().includes('email') ? 'border-red-500' : 'border-gray-300'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              id="email"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="password">
              Password
            </label>
            <input
              className={`appearance-none block w-full px-3 py-3 border ${
                formError.includes('password') || formError.includes('INCORRECT_PASSWORD') ? 'border-red-500' : 'border-gray-300'
              } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
              id="password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              onKeyPress={(e) => {
                // Handle Enter key press
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleLoginClick();
                }
              }}
            />
          </div>
          
          <div>
            <button
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
              type="button" // Changed from submit to button
              disabled={isSubmitting}
              onClick={handleLoginClick}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </div>
        
        <div className="text-center mt-8">
          <p className="text-base text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500 transition duration-150">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}; 