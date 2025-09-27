import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  Award, 
  BookOpen, 
  Heart, 
  MapPin,
  ArrowRight,
  Phone,
  Mail,
  Clock,
  ChevronDown
} from 'lucide-react';
import PublicLayout from '../../components/layouts/PublicLayout';
import heroVideo from '../../assets/media/hero.mp4';
import PageHero from '../../components/website/PageHero';

const AnimatedNumber = ({ value, suffix = '', duration = 1200 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const animate = (now) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplayValue(Math.round(value * eased));
          if (p < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
        io.disconnect();
      }
    }, { threshold: 0.1, rootMargin: '0px 0px -20% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{displayValue.toLocaleString()}{suffix}</span>;
};

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

const About = () => {
  const [parallaxY, setParallaxY] = useState(0);
  const [mvmTab, setMvmTab] = useState('mission');

  // Scroll reveal refs
  const [mvmRef, mvmVisible] = useScrollReveal();
  const [whatWeDoRef, whatWeDoVisible] = useScrollReveal();
  const [howWeWorkRef, howWeWorkVisible] = useScrollReveal();

  useEffect(() => {
    let rafId = 0;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setParallaxY(window.scrollY * 0.5);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <PublicLayout>
      <PageHero
        title="About the Local Youth Development Office"
        subtitle="We empower, engage, and support the youth of San Jose, Batangas through programs, participation, and partnerships."
      />

      {/* Mission • Vision • Mandate - AWS-like layout */}
      <section className="pt-16 pb-8 md:py-16 bg-white">
        <div 
          ref={mvmRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${
            mvmVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Overline badge */}
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-xs font-semibold uppercase tracking-wider mb-2">About LYDO</div>
          {/* Section heading */}
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Mission, Vision, and Mandate</h2>
          <p className="text-gray-700 max-w-3xl">For a clear understanding of the LYDO’s purpose and direction, browse our mission, vision, and mandate.</p>
          {/* Refined divider */}
          <div className="mt-5 mb-10 h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />

          {/* Segmented control */}
          <div className="flex justify-start mb-10">
            {/* Segmented control with sliding active pill */}
            <div className="relative inline-grid grid-cols-3 items-center rounded-full bg-gray-100 ring-1 ring-gray-300 p-2 shadow-sm overflow-hidden">
              {/* Active slider */}
              <span
                className={`absolute inset-y-1 left-0 w-1/3 rounded-full bg-gradient-to-r from-rose-200 via-purple-200 to-indigo-200 shadow-md ring-1 ring-gray-200 transition-transform duration-200 ease-out pointer-events-none ${
                  mvmTab === 'mission' ? 'translate-x-0' : mvmTab === 'vision' ? 'translate-x-[100%]' : 'translate-x-[200%]'
                }`}
                aria-hidden="true"
              />
              {[
                { key: 'mission', label: 'Mission' },
                { key: 'vision', label: 'Vision' },
                { key: 'mandate', label: 'Mandate' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMvmTab(key)}
                  className={`relative z-10 px-8 sm:px-10 py-3 text-base md:text-lg rounded-full transition-colors duration-300 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24345A]/30 ${
                    mvmTab === key ? 'text-[#24345A]' : 'text-gray-700 hover:text-[#24345A] hover:bg-white/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Two-column content */}
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="order-2 md:order-1">
              {mvmTab === 'mission' && (
                <div>
                  <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-3">Our Mission</h3>
                  <p className="text-gray-600 leading-relaxed">
                    To ignite youth involvement in public and civic affairs that ought to inculcate patriotism, nationalism, and other desirable values in the youth and empower them to play a vital role in their own development as well as in our community.
                  </p>
                </div>
              )}
              {mvmTab === 'vision' && (
                <div>
                  <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-3">Our Vision</h3>
                  <p className="text-gray-600 leading-relaxed">
                    To establish adequate, effective, responsive and enabling mechanisms and support systems that will empower the youth and ensure their meaningful participation in governance.
                  </p>
                </div>
              )}
              {mvmTab === 'mandate' && (
                <div>
                  <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-3">Our Mandate</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Implement youth empowerment and development programs in accordance with Republic Act No. 10742, as amended by Republic Act No. 11768.
                  </p>
                </div>
              )}
            </div>

            <div className="order-1 md:order-2">
              <div className="rounded-2xl ring-1 ring-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="relative aspect-[16/9] bg-gradient-to-br from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1]">
                  <img
                    src="https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=1200&auto=format&fit=crop"
                    alt="Youth collaboration"
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What we do */}
      <section className="pt-8 pb-8 md:py-16 bg-white">
        <div 
          ref={whatWeDoRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out delay-200 ${
            whatWeDoVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-xs font-semibold uppercase tracking-wider mb-2">What we do</div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Programs and Services</h2>
          <p className="text-gray-600 max-w-3xl">Explore our core programs and services that support youth development, SK governance, and community engagement.</p>
          <div className="mt-5 mb-10 h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: BookOpen, title: 'Youth Programs', desc: 'Education, skills, health, and leadership development.' },
              { icon: Users, title: 'SK Governance Support', desc: 'Capacity building, compliance, and coordination.' },
              { icon: Calendar, title: 'Events & Engagement', desc: 'Community activities and youth participation.' },
              { icon: Award, title: 'Research & Surveys', desc: 'Data to design better youth policies.' },
              { icon: Heart, title: 'Welfare & Protection', desc: 'Support services and referrals.' },
              { icon: MapPin, title: 'Partnerships', desc: 'Collaboration with barangays, schools, and NGOs.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group relative">
                {/* Glow background */}
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                {/* Card */}
                <div className="relative rounded-3xl p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm transition-transform duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 text-gray-600 ring-1 ring-gray-200">Service</span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-gray-900">{title}</h3>
                  <p className="mt-2 text-gray-600 text-sm leading-relaxed">{desc}</p>
                  <div className="mt-6 relative inline-flex items-center text-gray-400 group-hover:text-[#24345A] transition-colors w-32">
                    <span className="absolute left-0 text-sm font-medium opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100">Learn more</span>
                    <ArrowRight className="w-5 h-5 transform transition-transform duration-200 group-hover:translate-x-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      

      {/* How we work - FAQ layout copy */}
      <section className="pt-8 pb-16 md:py-16 bg-white">
        <div 
          ref={howWeWorkRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out delay-400 ${
            howWeWorkVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="rounded-3xl bg-white ring-1 ring-gray-200 p-6 md:p-10">
            <div className="grid md:grid-cols-2 gap-10">
              {/* Left intro */}
              <div>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-xs font-semibold uppercase tracking-wider mb-2">Process</div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How We Work</h2>
                <p className="text-gray-600 max-w-xl">Here are the ways we work with youth and SK councils. If you need more help, feel free to contact us.</p>
                <div className="mt-5 mb-6 h-[2px] w-full max-w-xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />
                {/* Contact Support link removed as requested */}
              </div>
              {/* Right: accordions */}
              <div className="space-y-3">
                <AccordionItem title="For Youth" defaultOpen variant="faq">
                  <ul className="list-disc ml-5 text-gray-600 space-y-1">
                    <li>Join programs and events</li>
                    <li>Volunteer and participate in surveys</li>
                    <li>Get updates via announcements and social media</li>
                  </ul>
                </AccordionItem>
                <AccordionItem title="For SK Councils" variant="faq">
                  <ul className="list-disc ml-5 text-gray-600 space-y-1">
                    <li>Coordination for projects and reports</li>
                    <li>Capacity building and compliance support</li>
                    <li>Data and research collaboration</li>
                  </ul>
                </AccordionItem>
              </div>
            </div>
        </div>
      </div>
      </section>

      

      
    </PublicLayout>
  );
};

// Lightweight accordion component used above
const AccordionItem = ({ title, children, defaultOpen = false, variant }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`group relative ${variant === 'faq' ? '' : ''}`}>
      {variant !== 'faq' && (
        <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative w-full flex items-center justify-between text-left transition-colors duration-200 ${
          variant === 'faq'
            ? 'py-5 border-b border-gray-200 text-gray-900 hover:text-[#24345A]'
            : 'rounded-3xl p-5 bg-gray-50 ring-1 ring-gray-200 shadow-sm'
        }`}
      >
        <span className={`text-lg font-semibold ${variant === 'faq' ? '' : 'text-gray-900'}`}>{title}</span>
        <ChevronDown className={`w-5 h-5 ${variant === 'faq' ? 'text-gray-600' : 'text-gray-500'} transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className={`${variant === 'faq' ? 'py-4 border-b border-gray-200 text-gray-600' : 'px-5 pb-5 pt-2 bg-gray-50 rounded-b-3xl ring-1 ring-gray-200 ring-t-0'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default About;
