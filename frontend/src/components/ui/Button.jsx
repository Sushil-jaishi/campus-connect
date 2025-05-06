import { Link } from 'react-router-dom';

export const Button = ({ 
  children, 
  to, 
  onClick, 
  type = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  ...props 
}) => {
  // Style variations
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700',
    success: 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
  };

  // Size variations
  const sizes = {
    sm: 'px-4 py-1.5 text-sm',
    md: 'px-6 py-2 text-sm',
    lg: 'px-8 py-3 text-base'
  };

  // Base button classes
  const baseClasses = 'font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 inline-flex items-center justify-center';
  
  // Combined classes
  const buttonClasses = `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;

  // If there's a "to" prop, render a Link
  if (to) {
    return (
      <Link to={to} className={buttonClasses} {...props}>
        <span className="text-white">{children}</span>
      </Link>
    );
  }

  // Otherwise render a button
  return (
    <button
      type={type}
      onClick={onClick}
      className={buttonClasses}
      {...props}
    >
      <span className="text-white">{children}</span>
    </button>
  );
}; 