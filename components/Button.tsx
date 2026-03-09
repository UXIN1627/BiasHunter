import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'option';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white";
  
  const variants = {
    // Elegant Dark Button
    primary: "bg-slate-800 hover:bg-slate-900 text-white shadow-lg shadow-slate-300/50 hover:shadow-xl hover:-translate-y-0.5",
    
    // Soft Secondary
    secondary: "bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-sm",
    
    // Option Selection Button (Uniform Color)
    option: "w-full text-center py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold tracking-wide shadow-md hover:shadow-lg uppercase text-sm"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};