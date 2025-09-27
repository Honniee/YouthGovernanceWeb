import React, { useEffect, useRef, useState } from 'react';
import { 
  Users, 
  BookOpen, 
  Heart, 
  Shield,
  Globe,
  Leaf,
  UserCheck,
  Building,
  Award,
  Briefcase,
  TreePine,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import PublicLayout from '../../components/layouts/PublicLayout';
import PageHero from '../../components/website/PageHero';
import heroVideo from '../../assets/media/hero.mp4';

// Scroll reveal hook
const useScrollReveal = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return [ref, isVisible];
};

// Accordion component
const AccordionItem = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-full flex items-center justify-between text-left py-3 sm:py-4 lg:py-5 border-b border-gray-200 text-gray-900 hover:text-[#24345A] transition-colors duration-200"
      >
        <span className="text-base sm:text-lg font-semibold">{title}</span>
        <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="py-3 sm:py-4 border-b border-gray-200 text-gray-600">
          {children}
        </div>
      </div>
    </div>
  );
};

const LYDOCouncil = () => {
  // Scroll reveal refs
  const [overviewRef, overviewVisible] = useScrollReveal();
  const [membersRef, membersVisible] = useScrollReveal();
  const [structureRef, structureVisible] = useScrollReveal();
  const [contactRef, contactVisible] = useScrollReveal();

  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const carouselRef = useRef(null);
  const intervalRef = useRef(null);

  // Council images for carousel
  const councilImages = [
    {
      src: "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=1200&auto=format&fit=crop",
      alt: "LYDO Council meeting",
      title: "Council Meeting",
      description: "Regular council meetings to discuss youth development initiatives"
    },
    {
      src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop",
      alt: "Youth development workshop",
      title: "Youth Workshop",
      description: "Engaging workshops and training sessions for local youth"
    },
    {
      src: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1200&auto=format&fit=crop",
      alt: "Community outreach program",
      title: "Community Outreach",
      description: "Active community engagement and outreach programs"
    },
    {
      src: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=1200&auto=format&fit=crop",
      alt: "Youth leadership development",
      title: "Leadership Development",
      description: "Developing future leaders through mentorship and training"
    }
  ];

  // Auto-play functionality
  useEffect(() => {
    if (isAutoPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % councilImages.length);
      }, 4000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoPlaying, councilImages.length]);

  // Touch/swipe support
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % councilImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + councilImages.length) % councilImages.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Council members data
  const councilMembers = [
    { 
      role: 'Chairperson', 
      name: 'Hon. Mark H. Arre', 
      focus: 'SK Federation President',
      icon: Users,
      description: 'Leads the SK Federation and coordinates youth governance initiatives across all barangays.'
    },
    { 
      role: 'Vice Chairperson', 
      name: 'Hon. Julie Anne G. Flores', 
      focus: 'SK Federation Vice President',
      icon: Users,
      description: 'Supports the chairperson and oversees youth development programs and activities.'
    },
    { 
      role: 'Member', 
      name: 'Mr. Luis Emmanuel Ramos', 
      focus: 'Education',
      icon: BookOpen,
      description: 'Advocates for educational programs and initiatives that enhance youth learning opportunities.'
    },
    { 
      role: 'Member', 
      name: 'Mr. Jarred Vincent M. Asi', 
      focus: 'Health',
      icon: Heart,
      description: 'Promotes health awareness and wellness programs for the youth community.'
    },
    { 
      role: 'Member', 
      name: 'Ms. Christia Nasel M. Luna', 
      focus: 'Governance',
      icon: Shield,
      description: 'Focuses on governance reforms and youth participation in local government processes.'
    },
    { 
      role: 'Member', 
      name: 'Mr. Marc Adrian D. Marinas', 
      focus: 'Governance',
      icon: Shield,
      description: 'Works on policy development and youth representation in governance structures.'
    },
    { 
      role: 'Member', 
      name: 'Ms. Larry P. Gotgotao Jr.', 
      focus: 'Social Inclusion & Equity',
      icon: UserCheck,
      description: 'Ensures inclusive participation and equal opportunities for all youth sectors.'
    },
    { 
      role: 'Member', 
      name: 'Ms. Juvhi Isabel Teofila F. Kamus', 
      focus: 'Global Mobility',
      icon: Globe,
      description: 'Facilitates international youth exchanges and global mobility programs.'
    },
    { 
      role: 'Member', 
      name: 'Hon. Christopher B. Umali', 
      focus: 'Environment Protection',
      icon: Leaf,
      description: 'Leads environmental advocacy and sustainability initiatives for youth.'
    },
    { 
      role: 'Member', 
      name: 'Ms. Lian Airisteah M. San Pedro', 
      focus: 'Active Citizenship',
      icon: Building,
      description: 'Promotes civic engagement and active participation in community development.'
    },
    { 
      role: 'Member', 
      name: 'Ms. Rica Helaena B. Rea', 
      focus: 'Peacebuilding & Security',
      icon: Award,
      description: 'Works on peace and security initiatives, promoting harmony within the community.'
    },
    { 
      role: 'Member', 
      name: 'Ms. Danna Shiori Briones', 
      focus: 'Economic Empowerment',
      icon: Briefcase,
      description: 'Develops economic opportunities and entrepreneurship programs for youth.'
    },
    { 
      role: 'Member', 
      name: 'Mr. Josh Zyk L. Lumanglas', 
      focus: 'Agriculture',
      icon: TreePine,
      description: 'Promotes agricultural development and sustainable farming practices among youth.'
    }
  ];

  return (
    <PublicLayout>
      <PageHero
        badge="LYDO Council"
        title="LYDO Council"
        subtitle="Meet the Local Youth Development Council members representing diverse sectors and advocacy areas in San Jose, Batangas"
        description="Discover the dedicated individuals who guide youth development initiatives and represent various sectors across our community."
      />

      {/* Council Overview */}
      <section className="pt-16 pb-8 md:py-16 bg-white">
        <div 
          ref={overviewRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${
            overviewVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Overline badge */}
          <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3 lg:mb-4">About LYDC</div>
          {/* Section heading */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4">Council Overview</h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-700 max-w-3xl">The Local Youth Development Council serves as a collaborative body that guides youth development initiatives and ensures comprehensive representation across all sectors.</p>
          {/* Refined divider */}
          <div className="mt-4 sm:mt-5 mb-6 sm:mb-8 lg:mb-10 h-[1px] sm:h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />

          {/* Two-column content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-start">
            <div className="order-2 md:order-1">
              <div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-900 mb-2 sm:mb-3">Our Purpose</h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-4 sm:mb-6">
                  The LYDC serves as a collaborative body that supports youth development initiatives in San Jose, Batangas. It brings together SK leaders and sectoral representatives to guide programs aligned with national and local youth priorities.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 ring-1 ring-gray-200">
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">13 Members</h4>
                    <p className="text-xs sm:text-sm text-gray-600">Diverse sectoral representation</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 ring-1 ring-gray-200">
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">12 Focus Areas</h4>
                    <p className="text-xs sm:text-sm text-gray-600">Comprehensive advocacy coverage</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <div 
                ref={carouselRef}
                className="relative rounded-xl sm:rounded-2xl ring-1 ring-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseEnter={() => setIsAutoPlaying(false)}
                onMouseLeave={() => setIsAutoPlaying(true)}
              >
                {/* Carousel Container */}
                <div className="relative aspect-[16/9] bg-gradient-to-br from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] overflow-hidden">
                  {/* Slides */}
                  <div 
                    className="flex transition-transform duration-500 ease-in-out h-full"
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                  >
                    {councilImages.map((image, index) => (
                      <div key={index} className="w-full h-full flex-shrink-0 relative">
                        <img
                          src={image.src}
                          alt={image.alt}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                        {/* Image Overlay with Title and Description */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
                          <h4 className="text-base sm:text-xl font-semibold mb-1 sm:mb-2">{image.title}</h4>
                          <p className="text-xs sm:text-sm opacity-90">{image.description}</p>
                        </div>
                      </div>
                    ))}
          </div>

                  {/* Navigation Arrows */}
                  <button
                    onClick={prevSlide}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center text-gray-700 hover:text-[#24345A] transition-all duration-200 hover:scale-110"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center text-gray-700 hover:text-[#24345A] transition-all duration-200 hover:scale-110"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  {/* Slide Indicators */}
                  <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex space-x-1.5 sm:space-x-2">
                    {councilImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-200 ${
                          index === currentSlide 
                            ? 'bg-white scale-125' 
                            : 'bg-white/50 hover:bg-white/75'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Council Members */}
      <section className="pt-8 pb-8 md:py-16 bg-white">
        <div 
          ref={membersRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out delay-200 ${
            membersVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3 lg:mb-4">Leadership</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4">Council Members</h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-3xl">Meet the dedicated individuals who represent various sectors and advocate for youth development across San Jose, Batangas.</p>
          <div className="mt-4 sm:mt-5 mb-6 sm:mb-8 lg:mb-10 h-[1px] sm:h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {councilMembers.map((member, index) => (
              <div key={index} className="group relative">
                {/* Glow background */}
                <div className="absolute -inset-1 sm:-inset-2 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                {/* Card */}
                <div className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm transition-transform duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200">
                      <member.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-0.5 text-[10px] sm:text-[11px] font-medium rounded-full bg-gray-100 text-gray-600 ring-1 ring-gray-200">{member.role}</span>
                  </div>
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-1">{member.name}</h3>
                  <p className="text-xs sm:text-sm font-medium text-[#24345A] mb-2 sm:mb-3">{member.focus}</p>
                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">{member.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Council Structure */}
      <section className="pt-8 pb-8 md:py-16 bg-white">
        <div 
          ref={structureRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out delay-300 ${
            structureVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="rounded-2xl sm:rounded-3xl bg-white ring-1 ring-gray-200 p-4 sm:p-6 md:p-8 lg:p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
              {/* Left intro */}
              <div>
                <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3">Structure</div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4">Council Structure</h2>
                <p className="text-sm sm:text-base text-gray-600 max-w-xl">The LYDC is organized into leadership roles and sectoral representatives, each focusing on specific advocacy areas for comprehensive youth development.</p>
                <div className="mt-4 sm:mt-5 mb-4 sm:mb-6 h-[1px] sm:h-[2px] w-full max-w-xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />
              </div>
              {/* Right: accordions */}
              <div className="space-y-2 sm:space-y-3">
                <AccordionItem title="Leadership" defaultOpen variant="faq">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#24345A]" />
                      <div>
                        <p className="text-sm sm:text-base font-semibold text-gray-900">Hon. Mark H. Arre</p>
                        <p className="text-xs sm:text-sm text-gray-600">Chairperson - SK Federation President</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#24345A]" />
                      <div>
                        <p className="text-sm sm:text-base font-semibold text-gray-900">Hon. Julie Anne G. Flores</p>
                        <p className="text-xs sm:text-sm text-gray-600">Vice Chairperson - SK Federation Vice President</p>
                      </div>
                    </div>
                  </div>
                </AccordionItem>
                <AccordionItem title="Sectoral Representatives" variant="faq">
                  <div className="space-y-1.5 sm:space-y-2">
                    {councilMembers.slice(2).map((member, index) => (
                      <div key={index} className="flex items-center gap-2 sm:gap-3 py-1.5 sm:py-2">
                        <member.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#24345A] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{member.name}</p>
                          <p className="text-[10px] sm:text-xs text-gray-600 truncate">{member.focus}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionItem>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="pt-8 pb-16 md:py-16 bg-white">
        <div 
          ref={contactRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out delay-400 ${
            contactVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-xs font-semibold uppercase tracking-wider mb-2">Contact</div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Get in Touch</h2>
          <p className="text-gray-600 max-w-3xl">Need to reach the LYDO Council? Contact us for inquiries, meetings, or collaboration opportunities.</p>
          <div className="mt-5 mb-10 h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group relative">
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
              <div className="relative rounded-3xl p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm transition-transform duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200 mb-4">
                  <Building className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Office Location</h3>
                <p className="text-gray-600 text-sm">San Jose Municipal Hall, Batangas</p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
              <div className="relative rounded-3xl p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm transition-transform duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200 mb-4">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Council Meetings</h3>
                <p className="text-gray-600 text-sm">Monthly meetings - 2nd Saturday of each month</p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
              <div className="relative rounded-3xl p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm transition-transform duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200 mb-4">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Contact Information</h3>
                <p className="text-gray-600 text-sm">+63 (43) 123-4567</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default LYDOCouncil;
