import React, { useState, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Menu, X, Globe, Phone, HelpCircle, Eye, User } from 'lucide-react';
import sanJoseLogo from '../../assets/logos/san_jose_logo.webp';
import { useNotice } from '../../context/NoticeContext';
import ImportantNoticeBanner from './ImportantNoticeBanner';

const PublicHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { showNotice, setShowNotice } = useNotice();
  const location = useLocation();

  const navItems = [
    { title: 'Home', path: '/' },
    { title: 'About', path: '/about' },
    { title: 'Programs', path: '/programs' },
    { title: 'SK Officials', path: '/sk-officials' },
    { title: 'LYDO Council', path: '/lydo-council' },
    { title: 'KK Survey', path: '/kk-survey' }
  ];

  const isActive = (path) => location.pathname === path;

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
    // Add search functionality here
  };

  return (
    <header className="w-full fixed top-0 left-0 right-0 z-50">
      
      {/* Important Notice Banner */}
      <ImportantNoticeBanner />

      {/* Main Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">  
        <div className="flex items-center justify-between py-4">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <img 
              src={sanJoseLogo} 
              alt="San Jose Logo" 
              className="h-12 w-12 object-contain"
            />
            <div>
              <h1 className="text-lg md:text-xl font-bold text-blue-900">
                Local Youth Development Office
              </h1>
              <p className="text-xs md:text-sm text-gray-600">
                Municipality of San Jose, Batangas
              </p>
            </div>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:block flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for services..."
                className="w-full pl-4 pr-12 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600"
              >
                <Search className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-blue-600"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Search Bar removed */}
      </div>
    </div>

    {/* Navigation Menu */}
    <nav className="bg-[#24345A] text-white">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center justify-between w-full">
        <div className="flex space-x-0">
          {navItems.map((item) => (
            <Link
              key={item.title}
              to={item.path}
              className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors ${
                isActive(item.path)
                  ? 'border-white text-white'
                  : 'border-transparent text-white/80 hover:text-white hover:border-white/50'
              }`}
            >
              {item.title}
            </Link>
          ))}
        </div>
        
        {/* Login Button */}
        <Link
          to="/login"
          className="ml-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border-2 border-white/80 text-white hover:bg-white/90 hover:text-[#24345A] focus:outline-none focus:ring-2 focus:ring-white/60 transition-colors shadow-[inset_0_0_0_0_rgba(0,0,0,0)] hover:shadow-sm"
        >
          <User className="w-4 h-4" />
          <span className="text-sm font-medium">Login</span>
        </Link>
      </div>

                {/* Mobile Sidebar Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-[60] md:hidden"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar Navigation */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-[70] md:hidden ${
        isMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Header */}
        <div className="bg-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={sanJoseLogo} 
                alt="San Jose Logo" 
                className="h-10 w-10 object-contain"
              />
              <div>
                <h2 className="text-lg font-bold">LYDO</h2>
                <p className="text-sm text-blue-200">San Jose, Batangas</p>
              </div>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="py-6">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.title}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-[#24345A]/10 text-[#24345A] border-r-4 border-[#24345A]'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-[#24345A]'
                }`}
              >
                {item.title}
              </Link>
            ))}
          </nav>
          
          {/* Login Button in Sidebar */}
          <div className="px-6 pt-6 mt-6 border-t border-gray-200">
            <Link
              to="/login"
              onClick={() => setIsMenuOpen(false)}
              className="block w-full py-2.5 px-4 text-sm font-medium rounded-full text-center border-2 border-[#24345A] text-[#24345A] hover:bg-[#24345A] hover:text-white transition-colors"
            >
              Login
            </Link>
          </div>

          {/* Contact Info in Sidebar */}
          <div className="px-6 pt-6 mt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Contact</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Municipal Hall, San Jose</p>
              <p>Batangas, Philippines</p>
              <p className="text-blue-600">(043) 756-XXXX</p>
            </div>
          </div>
        </div>
      </div>
     </div>
   </nav>
 </header>
);
};

export default memo(PublicHeader); 