import React, { useState } from 'react';
import ReCaptchaComponent from '../ui/ReCaptchaComponent';
import { useReCaptcha } from '../../hooks/useReCaptcha';
import { Send, User, Mail, MessageSquare } from 'lucide-react';

/**
 * Example Contact Form using reusable reCAPTCHA component
 * This demonstrates how to use the reCAPTCHA component in different forms
 */
const ContactFormExample = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Initialize reCAPTCHA hook
  const recaptcha = useReCaptcha({
    required: true,
    onSuccess: (token) => {
      console.log('reCAPTCHA verified:', token);
      setErrors(prev => ({ ...prev, recaptcha: '' }));
    },
    onError: () => {
      setErrors(prev => ({ ...prev, recaptcha: 'Please complete the verification' }));
    }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors as user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    }

    // Validate reCAPTCHA
    if (!recaptcha.validate()) {
      newErrors.recaptcha = recaptcha.error || 'Please complete the verification';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Form submitted:', {
        ...formData,
        recaptchaToken: recaptcha.token
      });

      setSuccess(true);
      setFormData({ name: '', email: '', message: '' });
      recaptcha.reset();
      
    } catch (error) {
      setErrors({ submit: 'Failed to send message. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="text-green-600 mb-2">
          <Send className="w-8 h-8 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-green-800 mb-2">Message Sent!</h3>
        <p className="text-green-700 mb-4">Thank you for your message. We'll get back to you soon.</p>
        <button
          onClick={() => setSuccess(false)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Us</h2>
        <p className="text-gray-600">Send us a message and we'll respond shortly.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            <User className="w-4 h-4 inline mr-1" />
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Your full name"
          />
          {errors.name && (
            <p className="text-red-600 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            <Mail className="w-4 h-4 inline mr-1" />
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="your.email@example.com"
          />
          {errors.email && (
            <p className="text-red-600 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        {/* Message Field */}
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            <MessageSquare className="w-4 h-4 inline mr-1" />
            Message
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            value={formData.message}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              errors.message ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Your message here..."
          />
          {errors.message && (
            <p className="text-red-600 text-sm mt-1">{errors.message}</p>
          )}
        </div>

        {/* reCAPTCHA */}
        <ReCaptchaComponent
          ref={recaptcha.ref}
          onVerify={recaptcha.onVerify}
          onError={recaptcha.onError}
          onExpire={recaptcha.onExpire}
          errorMessage={errors.recaptcha}
          size="compact"
          className="flex justify-center"
        />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !recaptcha.isVerified}
          className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white transition-all duration-200 ${
            isSubmitting || !recaptcha.isVerified
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Message
            </>
          )}
        </button>

        {errors.submit && (
          <p className="text-red-600 text-sm text-center">{errors.submit}</p>
        )}
      </form>
    </div>
  );
};

export default ContactFormExample; 