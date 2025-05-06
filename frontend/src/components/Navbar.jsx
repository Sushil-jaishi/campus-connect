import { Link, NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useState, useRef, useEffect } from "react"

export const Navbar = () => {
  const { currentUser, logout } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  // Function to format image URL - updated to match Post component
  const formatImageUrl = (path) => {
    if (!path) return "https://placehold.co/150" // Default placeholder

    // If path is already a full URL
    if (path.startsWith("http")) return path

    // Base URL for images
    const baseUrl = "http://localhost:8000"

    // Replace backslashes with forward slashes (for Windows paths)
    let formattedPath = path.replace(/\\/g, "/")

    // If path is a relative server path starting with public
    if (formattedPath.startsWith("public/")) {
      formattedPath = formattedPath.replace("public/", "/")
    }

    // If path starts with ./public/, replace it with /
    if (formattedPath.startsWith("./public/")) {
      formattedPath = formattedPath.replace("./public/", "/")
    }

    // If path doesn't start with a slash, add it
    if (!formattedPath.startsWith("/")) {
      formattedPath = `/${formattedPath}`
    }

    return `${baseUrl}${formattedPath}`
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [dropdownRef])

  const handleLogout = async (e) => {
    e.preventDefault()
    try {
      await logout()
      setShowDropdown(false)
      navigate("/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const handleNavigation = (path) => {
    setShowDropdown(false)
    navigate(path)
  }

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-blue-800 text-2xl font-bold">
                Campus Connect
              </Link>
            </div>
          </div>

          {/* Right side components */}
          <div className="flex items-center">
            {currentUser ? (
              <>
                {/* Create Post button positioned on right */}
                <div>
                  <Link
                    to="/create-post"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700 shadow-sm hover:shadow-md transition-all group"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    <span className="text-white">Create Post</span>
                  </Link>
                </div>

                {/* Messages link */}
                <div className="ml-4">
                  <NavLink
                    to="/messages"
                    className={({ isActive }) =>
                      `inline-flex items-center px-1 pt-1 text-sm font-medium ${
                        isActive
                          ? "border-b-2 border-blue-800 text-blue-800"
                          : "text-gray-700 hover:text-blue-800"
                      }`
                    }
                  >
                    Messages
                  </NavLink>
                </div>

                {/* User profile with more spacing */}
                <div className="relative ml-12" ref={dropdownRef}>
                  <button
                    className="flex items-center text-gray-800 hover:text-blue-800 transition-colors"
                    onClick={() => setShowDropdown(!showDropdown)}
                    type="button"
                  >
                    <img
                      src={
                        currentUser.profileImage
                          ? formatImageUrl(currentUser.profileImage)
                          : "https://placehold.co/150"
                      }
                      alt="Profile"
                      className="w-10 h-10 rounded-full mr-3 object-cover ring-2 ring-blue-100"
                      onError={(e) => {
                        console.error("Failed to load profile image")
                        e.target.src = "https://placehold.co/150"
                      }}
                    />
                    <span className="text-base font-medium">
                      {currentUser?.username}
                    </span>
                    {currentUser?.role && (
                      <span className="ml-3 text-xs bg-blue-100 text-blue-800 py-1 px-3 rounded-full font-medium">
                        {currentUser.role}
                      </span>
                    )}
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-3 w-48 py-2 bg-white rounded-xl shadow-lg z-50 border border-gray-100 animate-fadeIn divide-y divide-gray-100">
                      <div className="py-1">
                        <button
                          onClick={() => handleNavigation("/profile")}
                          className="w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-800 transition-colors"
                        >
                          Profile
                        </button>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => handleNavigation("/settings")}
                          className="w-full text-left px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-800 transition-colors"
                        >
                          Settings
                        </button>
                      </div>
                      {currentUser?.role === "Admin" && (
                        <div className="py-1">
                          <button
                            onClick={() => handleNavigation("/admin")}
                            className="w-full text-left px-4 py-3 text-purple-700 hover:bg-purple-50 hover:text-purple-900 transition-colors"
                          >
                            Admin Dashboard
                          </button>
                        </div>
                      )}
                      <div className="py-1">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    `inline-flex items-center px-1 pt-1 text-sm font-medium ${
                      isActive
                        ? "border-b-2 border-blue-800 text-blue-800"
                        : "text-gray-700 hover:text-blue-800"
                    }`
                  }
                >
                  Login
                </NavLink>
                <Link
                  to="/register"
                  className="ml-4 px-6 py-2 bg-blue-800 text-white rounded-full font-medium hover:bg-blue-900 transition-all shadow-sm hover:shadow-md"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
