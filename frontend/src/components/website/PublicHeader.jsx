import React, { useState, useEffect, memo, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Menu, X, Globe, Phone, HelpCircle, Eye, User, MapPin, Mail, PhoneCall } from 'lucide-react';
import sanJoseLogo from '../../assets/logos/san_jose_logo.webp';
import NoticeContext from '../../context/NoticeContext';
import ImportantNoticeBanner from './ImportantNoticeBanner';
import logger from '../../utils/logger.js';

const PublicHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Safely get notice context - use useContext directly to handle missing provider gracefully
  const noticeContext = useContext(NoticeContext);
  const showNotice = noticeContext?.showNotice || false;
  const setShowNotice = noticeContext?.setShowNotice || (() => {});
  const location = useLocation();

  // Prevent background scrolling when sidebar is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

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
    logger.debug('Searching', { searchQuery });
    // Add search functionality here
  };

  return (
    <header className="w-full fixed top-0 left-0 right-0 z-50">
      
      {/* Important Notice Banner */}
      <ImportantNoticeBanner />

      {/* Main Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">  
        <div className="flex items-center justify-between py-2 md:py-3">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <img 
              src={sanJoseLogo} 
              alt="San Jose Logo" 
              className="h-8 w-8 md:h-10 md:w-10 object-contain"
            />
            <div>
              <h1 className="text-sm md:text-base font-bold text-blue-900">
                Local Youth Development Office
              </h1>
              <p className="text-xs text-gray-600">
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
            className="md:hidden p-1.5 text-gray-600 hover:text-blue-600"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
              className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors ${
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
          className="ml-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-white/80 text-white hover:bg-white/90 hover:text-[#24345A] focus:outline-none focus:ring-2 focus:ring-white/60 transition-colors shadow-[inset_0_0_0_0_rgba(0,0,0,0)] hover:shadow-sm"
        >
          <User className="w-4 h-4" />
          <span className="text-xs font-medium">Login</span>
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
        <div className="bg-[#24345A] text-white p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img 
                src={sanJoseLogo} 
                alt="San Jose Logo" 
                className="h-6 w-6 object-contain"
              />
              <div>
                <h2 className="text-sm font-bold">LYDO</h2>
                <p className="text-xs text-white/80">San Jose, Batangas</p>
              </div>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="text-white hover:text-white/80 transition-colors"
            >
              <X className="w-5 h-5" />
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
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Contact</h3>
            <div className="space-y-4">
              {/* Address */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 bg-[#24345A]/10 rounded-full flex items-center justify-center mt-0.5">
                  <MapPin className="w-3 h-3 text-[#24345A]" />
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  <p className="font-medium text-gray-800">2nd Floor, Archive Building</p>
                  <p>New Municipal Government Center</p>
                  <p>Brgy. Don Luis, San Jose, Batangas</p>
                </div>
              </div>
              
              {/* Email */}
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-5 h-5 bg-[#24345A]/10 rounded-full flex items-center justify-center">
                  <Mail className="w-3 h-3 text-[#24345A]" />
                </div>
                <a 
                  href="mailto:lydo@sanjosebatangas.gov.ph" 
                  className="text-sm text-[#24345A] hover:text-[#24345A]/80 transition-colors"
                >
                  lydo@sanjosebatangas.gov.ph
                </a>
              </div>
              
              {/* Phone */}
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-5 h-5 bg-[#24345A]/10 rounded-full flex items-center justify-center">
                  <PhoneCall className="w-3 h-3 text-[#24345A]" />
                </div>
                <a 
                  href="tel:+63437798550" 
                  className="text-sm text-[#24345A] hover:text-[#24345A]/80 transition-colors"
                >
                  (043) 779-8550 loc. 4006
                </a>
              </div>
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