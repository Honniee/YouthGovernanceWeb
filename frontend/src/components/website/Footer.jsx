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
    { label: 'Contact Us', path: '/contact' },
  ];

  const services = [
    { label: 'Youth Registration', path: '/register' },
    { label: 'KK Survey', path: '/survey' },
    { label: 'Forms & Documents', path: '/forms' },
    { label: 'Event Calendar', path: '/events' },
    { label: 'Announcements', path: '/announcements' },
  ];

  const legalLinks = [
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Terms of Service', path: '/terms' },
    { label: 'Data Protection', path: '/data-protection' },
    { label: 'Accessibility', path: '/accessibility' },
  ];

  return (
    <footer className="bg-blue-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Organization Info */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-4">
              <img 
                src={sanJoseLogo} 
                alt="San Jose Logo" 
                className="h-12 w-12 object-contain"
              />
              <div>
                <h3 className="text-lg font-bold text-white">LYDO</h3>
                <p className="text-blue-200 text-sm">San Jose, Batangas</p>
              </div>
            </div>
            <p className="text-blue-100 text-sm leading-relaxed mb-4">
              Local Youth Development Office dedicated to empowering the youth of San Jose 
              through programs, services, and governance opportunities that build stronger 
              communities and brighter futures.
            </p>
            <p className="text-green-400 text-sm font-medium italic">
              "Connect. Engage. Govern."
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link 
                    to={link.path}
                    className="text-blue-200 hover:text-white transition-colors duration-200 text-sm flex items-center"
                  >
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Services</h4>
            <ul className="space-y-2">
              {services.map((service) => (
                <li key={service.path}>
                  <Link 
                    to={service.path}
                    className="text-blue-200 hover:text-white transition-colors duration-200 text-sm flex items-center"
                  >
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                    {service.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Contact Information</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-blue-100 text-sm">
                    Municipal Hall<br />
                    San Jose, Batangas<br />
                    Philippines 4227
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-blue-300 flex-shrink-0" />
                <div>
                  <p className="text-blue-100 text-sm">(043) 756-XXXX</p>
                  <p className="text-blue-300 text-xs">Mon - Fri, 8:00 AM - 5:00 PM</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-green-300 flex-shrink-0" />
                <div>
                  <p className="text-blue-100 text-sm">lydo@sanjose-batangas.gov.ph</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-blue-100 text-sm">
                    Mon - Thu: 8:00 AM - 5:00 PM<br />
                    Fri: 8:00 AM - 7:00 PM
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-blue-800 bg-blue-950">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            
            {/* Copyright */}
            <div className="text-center md:text-left">
              <p className="text-blue-200 text-sm">
                © {currentYear} Local Youth Development Office, Municipality of San Jose, Batangas. 
                All rights reserved.
              </p>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center space-x-4">
              <span className="text-blue-200 text-sm mr-2">Follow us:</span>
              <a 
                href="#" 
                className="text-blue-300 hover:text-white transition-colors duration-200"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="text-blue-300 hover:text-white transition-colors duration-200"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="text-blue-300 hover:text-white transition-colors duration-200"
                aria-label="YouTube"
              >
                <Youtube className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="text-blue-300 hover:text-white transition-colors duration-200"
                aria-label="Website"
              >
                <Globe className="w-5 h-5" />
              </a>
            </div>

            {/* Legal Links */}
            <div className="flex flex-wrap justify-center md:justify-end space-x-4">
              {legalLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-blue-200 hover:text-white transition-colors duration-200 text-sm"
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