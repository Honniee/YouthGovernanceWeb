import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  ArrowLeft, 
  Home, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Users,
  Shield,
  Heart,
  Star,
  Award,
  Clock,
  User,
  FileText,
  Hash,
  Target,
  Share2,
  Plus,
  BarChart3,
  ArrowRight
} from 'lucide-react';
import { SurveyLayout } from '../../../components/survey';

// Animated counter component
const AnimatedCounter = ({ end, duration = 2000 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const currentCount = Math.floor(progress * end);
      setCount(currentCount);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration]);

  return count;
};

const SurveyThankYou = () => {
  const navigate = useNavigate();

  // Mock route params - in real app these would come from navigation
  const routeParams = {
    batchName: 'San Jose Youth Survey 2024',
    participant_email: 'participant@example.com',
    submissionId: 'KK-2024-SJ-00123',
    status: 'Verified'
  };

  const { batchName, participant_email, submissionId, status } = routeParams;

  const handleReturnHome = () => {
    navigate('/');
  };

  const handleNewSurvey = () => {
    navigate('/survey/start');
  };

  const handleShareResults = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'KK Survey Completed',
          text: `I just completed the KK Survey for ${batchName}! Submission ID: ${submissionId}`,
          url: window.location.origin
        });
      } catch (error) {
        console.error('Share failed:', error);
        handleFallbackShare();
      }
    } else {
      handleFallbackShare();
    }
  };

  const handleFallbackShare = () => {
    const shareText = `I just completed the KK Survey for ${batchName}! Submission ID: ${submissionId}`;
    navigator.clipboard.writeText(shareText).then(() => {
      alert('Achievement copied to clipboard!');
    }).catch(() => {
      alert('Share: ' + shareText);
    });
  };

  return (
    <>
    <SurveyLayout>
      {/* Top utility bar */}
      <div className="bg-[#24345A] fixed top-0 left-0 right-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')} 
            title="Return to main website" 
            className="inline-flex items-center gap-2 text-xs text-white/85 hover:text-white hover:bg-white/10 px-2.5 py-1 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <ArrowLeft className="w-3.5 h-3.5 opacity-90" />
            <span className="tracking-wide">Back to Website</span>
          </button>
          <a 
            href="mailto:lydo@sanjosebatangas.gov.ph" 
            title="Contact LYDO via email" 
            className="inline-flex items-center gap-2 text-xs text-white/85 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 px-2.5 py-1 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <Mail className="w-3.5 h-3.5 opacity-90" />
            <span className="tracking-wide">lydo@sanjosebatangas.gov.ph</span>
          </a>
        </div>
      </div>

      {/* Enhanced Survey Header */}
      <div className="bg-white border-b border-gray-200 fixed top-[40px] left-0 right-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3 sm:py-4">
            {/* Mobile: Stacked Layout */}
            <div className="block sm:hidden">
              <div className="flex items-center gap-2">
                <img 
                  src={new URL('../../../assets/logos/san_jose_logo.webp', import.meta.url).toString()} 
                  alt="Municipality Seal" 
                  className="w-7 h-7 rounded-full border flex-shrink-0" 
                />
                <div className="text-left flex-1 min-h-[28px] flex flex-col justify-center">
                  <div className="text-xs text-gray-600 leading-tight">Municipality of San Jose, Batangas</div>
                  <div className="text-xs text-gray-500 leading-tight">Local Youth Development Office</div>
                </div>
              </div>
            </div>

            {/* Desktop: Horizontal Layout */}
            <div className="hidden sm:grid grid-cols-3 items-center">
              {/* Left: Municipality Info */}
              <div className="flex items-center gap-3">
                <img 
                  src={new URL('../../../assets/logos/san_jose_logo.webp', import.meta.url).toString()} 
                  alt="Municipality Seal" 
                  className="w-9 h-9 rounded-full border" 
                />
                <div>
                  <div className="text-sm text-gray-600">Municipality of San Jose, Batangas</div>
                  <div className="text-xs text-gray-500">Local Youth Development Office</div>
                </div>
              </div>

              {/* Center: Survey Title */}
              <div className="flex justify-center">
                <h1 className="text-xl font-bold text-gray-900">KK Survey 2025</h1>
              </div>

              {/* Right: Completion Status */}
              <div className="flex items-center gap-6 justify-end">
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">Survey Complete</div>
                  <div className="text-sm text-gray-600">Thank you for participating</div>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-full">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span className="text-green-700 text-xs font-medium">Completed</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-white">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 mt-20 sm:mt-30">
          
          {/* Success Message */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-10 h-10 text-green-600 animate-pulse" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Thank You!
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
              Your survey has been successfully submitted. Your responses will help us better understand the
              needs and aspirations of our youth community.
            </p>
          </div>

           {/* Submission Details Card - Enhanced Receipt Style */}
           <div className="max-w-sm mx-auto mb-8">
             <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
               {/* Header with subtle gradient */}
               <div className="bg-gradient-to-r from-green-50 to-blue-50 px-4 py-3 border-b border-gray-100 text-center">
                 <div className="flex items-center justify-center gap-2">
                   <div className="p-2 rounded-full bg-green-100 text-green-700 shadow-sm">
                     <FileText className="w-4 h-4" />
                   </div>
                   <h3 className="text-sm font-bold text-gray-900">Submission Confirmed</h3>
                 </div>
                 <div className="text-xs text-gray-500 mt-1">KK Survey 2025</div>
               </div>
               
               {/* Receipt content */}
               <div className="px-4 py-4">
                 <div className="space-y-3 text-sm">
                   <div className="flex justify-between items-center py-1">
                     <span className="text-gray-600 font-medium">Participant</span>
                     <span className="text-gray-900 font-semibold text-right max-w-48 truncate">{participant_email}</span>
                   </div>
                   
                   <div className="flex justify-between items-center py-1">
                     <span className="text-gray-600 font-medium">Survey Batch</span>
                     <span className="text-gray-900 font-semibold text-right max-w-48 truncate">{batchName}</span>
                   </div>
                   
                   <div className="flex justify-between items-center py-1">
                     <span className="text-gray-600 font-medium">Submission ID</span>
                     <span className="text-gray-900 font-semibold font-mono text-xs">{submissionId}</span>
                   </div>
                   
                   <div className="flex justify-between items-center py-1">
                     <span className="text-gray-600 font-medium">Submitted</span>
                     <span className="text-gray-900 font-semibold text-xs">
                       {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </span>
                   </div>
                 </div>
                 
                 {/* Receipt footer */}
                 <div className="mt-4 pt-3 border-t border-gray-100">
                   <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                     <CheckCircle className="w-3 h-3 text-green-600" />
                     <span>Successfully processed</span>
                   </div>
                 </div>
               </div>
             </div>
           </div>

          {/* Action Buttons - One Line Two Columns */}
          <div className="mt-8 mb-8">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">What would you like to do next?</h3>
                <p className="text-gray-600 text-sm">Choose your next action</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {/* Share Achievement Button */}
                <button
                  onClick={handleShareResults}
                  className="group inline-flex items-center gap-3 px-6 py-3 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="w-8 h-8 rounded-full grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-900">Share Achievement</div>
                    <div className="text-xs text-gray-600">Share your completion</div>
                  </div>
                </button>

                {/* Return to Home Button */}
                <button
                  onClick={handleReturnHome}
                  className="group inline-flex items-center gap-3 px-6 py-3 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="w-8 h-8 rounded-full grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200">
                    <Home className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-gray-900">Return to Home</div>
                    <div className="text-xs text-gray-600">Go back to website</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900 text-xs sm:text-sm mb-1">Data Protected</h3>
                  <p className="text-green-700 text-xs leading-relaxed">Your information is secure and will be used only for official purposes.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 text-xs sm:text-sm mb-1">Community Impact</h3>
                  <p className="text-blue-700 text-xs leading-relaxed">Your responses help shape youth programs and policies in our municipality.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Heart className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-900 text-xs sm:text-sm mb-1">Youth Voice</h3>
                  <p className="text-purple-700 text-xs leading-relaxed">Your voice matters in building a better future for our youth community.</p>
                </div>
              </div>
            </div>
          </div>

          {/* What Happens Next - Simple Design */}
          <div className="mt-16 mb-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-xs font-semibold uppercase tracking-wider mb-2">Process</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">What Happens Next?</h3>
              <p className="text-gray-600">Follow the process of your survey submission</p>
              {/* Separator line */}
              <div className="mt-5 mb-8 h-[2px] w-full max-w-4xl mx-auto bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />
            </div>
            
            <div className="max-w-6xl mx-auto">
              <div className="relative">
                {/* Straight Dashed Connection Lines */}
                <div className="hidden lg:block absolute top-10 left-0 right-0 h-0 pointer-events-none">
                  {/* Line 1 to 2 */}
                  <div className="absolute" style={{ left: '20%', width: '30%', top: '0' }}>
                    <svg className="w-full h-4" viewBox="0 0 100 10" preserveAspectRatio="none">
                      <path
                        d="M 0 5 L 100 5"
                        fill="none"
                        stroke="#9CA3AF"
                        strokeWidth="1.5"
                        strokeDasharray="4,4"
                      />
                    </svg>
                  </div>
                  
                  {/* Line 2 to 3 */}
                  <div className="absolute" style={{ left: '50%', width: '30%', top: '0' }}>
                    <svg className="w-full h-4" viewBox="0 0 100 10" preserveAspectRatio="none">
                      <path
                        d="M 0 5 L 100 5"
                        fill="none"
                        stroke="#9CA3AF"
                        strokeWidth="1.5"
                        strokeDasharray="4,4"
                      />
                    </svg>
                  </div>
                </div>
                
                {/* Steps Grid - Horizontal Layout */}
                <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-4">
                  {[
                    {
                      step: '1',
                      title: 'Data Analysis',
                      desc: 'Our team will analyze your responses along with other participants to identify trends and needs.',
                      delay: '0s'
                    },
                    {
                      step: '2',
                      title: 'Program Development',
                      desc: 'Based on the findings, we\'ll develop targeted programs and initiatives for our youth.',
                      delay: '0.2s'
                    },
                    {
                      step: '3',
                      title: 'Community Updates',
                      desc: 'We\'ll share results and upcoming programs through our official channels.',
                      delay: '0.4s'
                    }
                  ].map(({ step, title, desc, delay }, index) => (
                    <div
                      key={step}
                      className="group flex flex-col items-center text-center transform transition-all duration-300 relative"
                      style={{ animationDelay: delay }}
                    >
                      {/* Step Circle */}
                      <div className="relative mb-6">
                        <div className="w-20 h-20 rounded-full bg-[#2F6666] flex items-center justify-center text-white font-bold text-2xl shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:bg-[#1a4d4d] relative z-10">
                          {step}
                        </div>
                        {/* Glow effect */}
                        <div className="absolute inset-0 w-20 h-20 rounded-full bg-[#2F6666] opacity-20 blur-xl transition-all duration-300 group-hover:opacity-40"></div>
                      </div>
                      
                      {/* Content */}
                      <div className="px-2 max-w-xs">
                        <h3 className="text-lg font-bold text-gray-900 mb-3 transition-colors duration-300 group-hover:text-[#2F6666]">
                          {title}
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed transition-all duration-300 group-hover:text-gray-700">
                          {desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Questions or Concerns - LYDOCouncil Style */}
          <div className="mt-16 mb-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-xs font-semibold uppercase tracking-wider mb-2">Contact</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Questions or Concerns?</h3>
              <p className="text-gray-600 max-w-3xl mx-auto">Need help with the survey? Contact us for inquiries, technical support, or any questions about your participation.</p>
            </div>
            <div className="mt-5 mb-10 h-[2px] w-full max-w-4xl mx-auto bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />

            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-3 gap-8">
              <div className="group relative">
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                <div className="relative rounded-3xl p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm transition-transform duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                  <div className="w-10 h-10 rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200 mb-4">
                    <Mail className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Support</h3>
                  <p className="text-gray-600 text-sm mb-3">Quick response for technical issues</p>
                  <a 
                    href="mailto:lydo@sanjosebatangas.gov.ph"
                    className="text-[#24345A] hover:text-[#1a2a4a] font-medium text-sm"
                  >
                    lydo@sanjosebatangas.gov.ph
                  </a>
                </div>
              </div>

              <div className="group relative">
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                <div className="relative rounded-3xl p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm transition-transform duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                  <div className="w-10 h-10 rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200 mb-4">
                    <Phone className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone Support</h3>
                  <p className="text-gray-600 text-sm mb-3">Direct assistance for urgent matters</p>
                  <a 
                    href="tel:+63431234567"
                    className="text-[#24345A] hover:text-[#1a2a4a] font-medium text-sm"
                  >
                    (043) 123-4567
                  </a>
                </div>
              </div>

              <div className="group relative">
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                <div className="relative rounded-3xl p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm transition-transform duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                  <div className="w-10 h-10 rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200 mb-4">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Office Location</h3>
                  <p className="text-gray-600 text-sm mb-3">Visit us for in-person assistance</p>
                  <p className="text-[#24345A] font-medium text-sm">
                    San Jose Municipal Hall, Batangas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        </div>
      </div>
    </SurveyLayout>

    {/* Footer */}
    <div className="bg-[#24345A] text-white py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="pt-4">
            <p className="text-white/70 text-xs">
              © 2025 Municipality of San Jose, Batangas • All rights reserved
            </p>
            <p className="text-white/60 text-xs mt-1">
              Powered by Local Youth Development Office
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default SurveyThankYou;
