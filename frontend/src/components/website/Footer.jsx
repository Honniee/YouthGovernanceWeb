import React from 'react';
import { Link } from 'react-router-dom';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Facebook, 
  Twitter, 
  Youtube,
  Globe,
  FileText,
  Users,
  Calendar
} from 'lucide-react';
import sanJoseLogo from '../../assets/logos/san_jose_logo.webp';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { label: 'About LYDO', path: '/about' },
    { label: 'Youth Programs', path: '/programs' },
    { label: 'SK Officials', path: '/officials' },
    { label: 'News & Updates', path: '/news' },
  ];

  const services = [
    { label: 'Youth Programs', path: '/programs' },
    { label: 'SK Governance', path: '/sk-officials' },
    { label: 'Community Events', path: '/programs/this-month' },
    { label: 'Youth Survey', path: '/survey' },
  ];

  const legalLinks = [
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Terms of Service', path: '/terms' },
    { label: 'Data Protection', path: '/data-protection' },
    { label: 'Data Subject Rights', path: '/data-subject-rights' },
    { label: 'Accessibility', path: '/accessibility' },
  ];

  return (
    <footer className="bg-[#24345A] text-white">
      {/* Main Footer Content */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          
          {/* Organization Info */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
              <img 
                src={sanJoseLogo} 
                alt="San Jose Logo" 
                className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
              />
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">LYDO</h3>
                <p className="text-white/70 text-xs sm:text-sm">San Jose, Batangas</p>
              </div>
            </div>
            <p className="text-white/80 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">
              Local Youth Development Office dedicated to empowering the youth of San Jose 
              through programs, services, and governance opportunities that build stronger 
              communities and brighter futures.
            </p>
            <p className="text-green-400 text-xs sm:text-sm font-medium italic">
              "Connect. Engage. Govern."
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-white">Quick Links</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path}
                    className="text-white/70 hover:text-white transition-colors duration-200 text-xs sm:text-sm flex items-center"
                  >
                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-green-400 rounded-full mr-1.5 sm:mr-2 flex-shrink-0"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-white">Services</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              {services.map((service) => (
                <li key={service.path}>
                  <Link 
                    to={service.path}
                    className="text-white/70 hover:text-white transition-colors duration-200 text-xs sm:text-sm flex items-center"
                  >
                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-blue-400 rounded-full mr-1.5 sm:mr-2 flex-shrink-0"></span>
                    {service.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-white">Contact Information</h4>
            <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white/80 text-xs sm:text-sm">
                     2nd Floor, Archive Building<br />
                     New Municipal Government Center<br />
                     Brgy. Don Luis, San Jose, Batangas<br />
                     Philippines 4227
                    </p>
                  </div>
                </div>
              
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300 flex-shrink-0" />
                <div>
                  <p className="text-white/80 text-xs sm:text-sm">(043) 779-8550 loc. 4006</p>
                  <p className="text-white/60 text-[10px] sm:text-xs">Mon - Fri, 8:00 AM - 5:00 PM</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-green-300 flex-shrink-0" />
                <div>
                  <p className="text-white/80 text-xs sm:text-sm">lydo@sanjosebatangas.gov.ph</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-2 sm:space-x-3">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white/80 text-xs sm:text-sm">+639-9661663137</p>
                  <p className="text-white/60 text-[10px] sm:text-xs">Mobile Number</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-white/10 bg-[#1a2a47]">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-3 lg:space-y-0">
            
            {/* Copyright */}
            <div className="text-center lg:text-left order-2 lg:order-1">
              <p className="text-white/70 text-xs sm:text-sm">
                © {currentYear} Local Youth Development Office, Municipality of San Jose, Batangas. 
                All rights reserved.
              </p>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center space-x-3 sm:space-x-4 order-1 lg:order-2">
              <span className="text-white/70 text-xs sm:text-sm mr-1 sm:mr-2">Follow us:</span>
              <a 
                href="#" 
                className="text-white/60 hover:text-white transition-colors duration-200"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a 
                href="#" 
                className="text-white/60 hover:text-white transition-colors duration-200"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a 
                href="#" 
                className="text-white/60 hover:text-white transition-colors duration-200"
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a 
                href="#" 
                className="text-white/60 hover:text-white transition-colors duration-200"
                aria-label="Website"
              >
                <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
            </div>

            {/* Legal Links */}
            <div className="flex flex-wrap justify-center lg:justify-end space-x-3 sm:space-x-4 order-3">
              {legalLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-white/70 hover:text-white transition-colors duration-200 text-xs sm:text-sm"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 