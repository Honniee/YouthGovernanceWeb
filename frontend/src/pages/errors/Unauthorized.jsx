import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, Home, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PublicLayout from '../../components/layouts/PublicLayout';

const Unauthorized = () => {
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <PublicLayout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <ShieldX className="mx-auto h-24 w-24 text-red-500" />
            <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
              Access Denied
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              You don't have permission to access this resource.
            </p>
          </div>
          
          <div className="mt-8 space-y-4">
            {user ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-800">
                  You are logged in as <strong>{user.email}</strong> with role <strong>{user.role}</strong>.
                  You need different permissions to access this page.
                </p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-800">
                  Your session may have expired. Please log in again.
                </p>
              </div>
            )}
            
            <div className="flex flex-col space-y-3">
              <Link
                to="/"
                className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Home
              </Link>
              
              {user && (
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout and Login as Different User
                </button>
              )}
              
              {!user && (
                <Link
                  to="/login"
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Unauthorized; 