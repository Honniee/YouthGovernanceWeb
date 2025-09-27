import React, { useEffect, useRef, useState } from 'react';
import { 
  Users, 
  Phone, 
  MapPin,
  Search,
  ChevronDown,
  Mail,
  Clock,
  Building
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
        className="relative w-full flex items-center justify-between text-left py-5 border-b border-gray-200 text-gray-900 hover:text-[#24345A] transition-colors duration-200"
      >
        <span className="text-lg font-semibold">{title}</span>
        <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="py-4 border-b border-gray-200 text-gray-600">
          {children}
        </div>
      </div>
    </div>
  );
};

const SKOfficials = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [expandedCards, setExpandedCards] = useState({});
  const [officialsSearchTerm, setOfficialsSearchTerm] = useState('');

  // Scroll reveal refs
  const [federationRef, federationVisible] = useScrollReveal();
  const [directoryRef, directoryVisible] = useScrollReveal();
  const [completeListRef, completeListVisible] = useScrollReveal();
  const [contactRef, contactVisible] = useScrollReveal();

  // SK Federation Officers data
  const federationOfficers = [
    { position: 'President', name: 'Hon. Mark H. Arre', barangay: 'Barangay Pinagtung-Ulan' },
    { position: 'Vice President', name: 'Hon. Julie Anne G. Flores', barangay: 'Barangay Galamay-Amo' },
    { position: 'Secretary', name: 'Hon. John M. Atienza', barangay: 'Barangay Don Luis' },
    { position: 'Treasurer', name: 'Hon. Joseph James H. Magpantay', barangay: 'Barangay Banaybanay I' },
    { position: 'Auditor', name: 'Hon. Avry Lennen G. Silva', barangay: 'Barangay Lalayat' },
    { position: 'PRO', name: 'Hon. Mayzelle V. Perez', barangay: 'Barangay Palanca' },
    { position: 'Sergeant at Arms', name: 'Hon. Allen Jacob Katigbak', barangay: 'Barangay Lapolapo II' }
  ];

  // Sample SK Chairpersons data (you can expand this)
  const skChairpersons = [
    { name: 'Hon. Mark H. Arre', barangay: 'Pinagtung-Ulan', contact: '+63 912 345 6789' },
    { name: 'Hon. Julie Anne G. Flores', barangay: 'Galamay-Amo', contact: '+63 923 456 7890' },
    { name: 'Hon. John M. Atienza', barangay: 'Don Luis', contact: '+63 934 567 8901' },
    { name: 'Hon. Joseph James H. Magpantay', barangay: 'Banaybanay I', contact: '+63 945 678 9012' },
    { name: 'Hon. Avry Lennen G. Silva', barangay: 'Lalayat', contact: '+63 956 789 0123' },
    { name: 'Hon. Mayzelle V. Perez', barangay: 'Palanca', contact: '+63 967 890 1234' },
    { name: 'Hon. Allen Jacob Katigbak', barangay: 'Lapolapo II', contact: '+63 978 901 2345' },
    { name: 'Hon. Maria Santos', barangay: 'Poblacion I', contact: '+63 989 012 3456' },
    { name: 'Hon. Juan Dela Cruz', barangay: 'Poblacion II', contact: '+63 990 123 4567' },
    { name: 'Hon. Ana Reyes', barangay: 'Poblacion III', contact: '+63 901 234 5678' }
  ];

  // Filter SK Chairpersons based on search
  const filteredChairpersons = skChairpersons.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.barangay.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sample complete SK officials data for expandable cards
  const barangayOfficials = [
    {
      barangay: 'Poblacion I',
      district: 'Poblacion District',
      chairperson: 'Hon. Maria Santos',
      councilors: [
        'Hon. Sarah Johnson',
        'Hon. Michael Torres',
        'Hon. Lisa Garcia',
        'Hon. David Martinez',
        'Hon. Jennifer Lee',
        'Hon. Robert Wilson',
        'Hon. Maria Rodriguez'
      ]
    },
    {
      barangay: 'Poblacion II',
      district: 'Poblacion District',
      chairperson: 'Hon. Juan Dela Cruz',
      councilors: [
        'Hon. Carlos Mendez',
        'Hon. Patricia Kim',
        'Hon. James Brown',
        'Hon. Sofia Chen',
        'Hon. Daniel Park',
        'Hon. Amanda White',
        'Hon. Christopher Davis'
      ]
    },
    {
      barangay: 'Poblacion III',
      district: 'Poblacion District',
      chairperson: 'Hon. Ana Reyes',
      councilors: [
        'Hon. Michelle Taylor',
        'Hon. Anthony Scott',
        'Hon. Rachel Green',
        'Hon. Kevin Adams',
        'Hon. Nicole Hall',
        'Hon. Brandon King',
        'Hon. Stephanie Wright'
      ]
    },
    {
      barangay: 'Pinagtung-Ulan',
      district: 'Rural District',
      chairperson: 'Hon. Mark H. Arre',
      councilors: [
        'Hon. Sarah Johnson',
        'Hon. Michael Torres',
        'Hon. Lisa Garcia',
        'Hon. David Martinez',
        'Hon. Jennifer Lee',
        'Hon. Robert Wilson',
        'Hon. Maria Rodriguez'
      ]
    },
    {
      barangay: 'Galamay-Amo',
      district: 'Rural District',
      chairperson: 'Hon. Julie Anne G. Flores',
      councilors: [
        'Hon. Carlos Mendez',
        'Hon. Patricia Kim',
        'Hon. James Brown',
        'Hon. Sofia Chen',
        'Hon. Daniel Park',
        'Hon. Amanda White',
        'Hon. Christopher Davis'
      ]
    },
    {
      barangay: 'Don Luis',
      district: 'Rural District',
      chairperson: 'Hon. John M. Atienza',
      councilors: [
        'Hon. Michelle Taylor',
        'Hon. Anthony Scott',
        'Hon. Rachel Green',
        'Hon. Kevin Adams',
        'Hon. Nicole Hall',
        'Hon. Brandon King',
        'Hon. Stephanie Wright'
      ]
    },
    {
      barangay: 'Banaybanay I',
      district: 'Coastal District',
      chairperson: 'Hon. Joseph James H. Magpantay',
      councilors: [
        'Hon. Sarah Johnson',
        'Hon. Michael Torres',
        'Hon. Lisa Garcia',
        'Hon. David Martinez',
        'Hon. Jennifer Lee',
        'Hon. Robert Wilson',
        'Hon. Maria Rodriguez'
      ]
    },
    {
      barangay: 'Lalayat',
      district: 'Coastal District',
      chairperson: 'Hon. Avry Lennen G. Silva',
      councilors: [
        'Hon. Carlos Mendez',
        'Hon. Patricia Kim',
        'Hon. James Brown',
        'Hon. Sofia Chen',
        'Hon. Daniel Park',
        'Hon. Amanda White',
        'Hon. Christopher Davis'
      ]
    },
    {
      barangay: 'Palanca',
      district: 'Coastal District',
      chairperson: 'Hon. Mayzelle V. Perez',
      councilors: [
        'Hon. Michelle Taylor',
        'Hon. Anthony Scott',
        'Hon. Rachel Green',
        'Hon. Kevin Adams',
        'Hon. Nicole Hall',
        'Hon. Brandon King',
        'Hon. Stephanie Wright'
      ]
    }
  ];

  // Toggle card expansion
  const toggleCard = (index) => {
    setExpandedCards(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Filter barangay officials based on search
  const filteredBarangayOfficials = barangayOfficials.filter(barangay =>
    barangay.barangay.toLowerCase().includes(officialsSearchTerm.toLowerCase()) ||
    barangay.district.toLowerCase().includes(officialsSearchTerm.toLowerCase()) ||
    barangay.chairperson.toLowerCase().includes(officialsSearchTerm.toLowerCase()) ||
    barangay.councilors.some(councilor => 
      councilor.toLowerCase().includes(officialsSearchTerm.toLowerCase())
    )
  );

  return (
    <PublicLayout>
      <PageHero
        badge="SK Officials"
        title="SK Officials & Contact Directory"
        subtitle="Meet the Sangguniang Kabataan Federation officers and connect with SK Chairpersons across San Jose, Batangas"
        description="Connect with youth leaders and explore the complete directory of SK officials across all barangays."
      />

      {/* SK Federation Officers */}
      <section className="pt-16 pb-8 md:py-16 bg-white">
        <div 
          ref={federationRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out ${
            federationVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3 lg:mb-4">Leadership</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4">SK Federation Officers</h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-700 max-w-3xl">Meet the current officers of the Sangguniang Kabataan Federation in San Jose, Batangas.</p>
          <div className="mt-4 sm:mt-5 mb-6 sm:mb-8 lg:mb-10 h-[1px] sm:h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />

           <div className="space-y-8">
             {/* President - Top Tier */}
             <div className="flex justify-center">
               <div className="group relative max-w-sm w-full">
                 <div className="absolute -inset-1 sm:-inset-2 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-yellow-300/30 via-amber-200/25 to-yellow-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                 <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-xl ring-2 ring-yellow-200 overflow-hidden transition-all duration-300 group-hover:shadow-2xl">
                   {/* Header with special gradient */}
                   <div className="h-20 sm:h-24 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 relative">
                     <div className="absolute inset-0 bg-black/10"></div>
                   </div>
                   
                   {/* Profile Photo */}
                   <div className="relative -mt-12 sm:-mt-16 mb-4 sm:mb-6">
                     <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full overflow-hidden ring-4 sm:ring-6 ring-white shadow-2xl">
                       <img
                         src={`https://images.unsplash.com/photo-${1500000000000 + 0}?w=150&h=150&fit=crop&crop=face`}
                         alt={federationOfficers[0].name}
                         className="w-full h-full object-cover"
                         loading="lazy"
                       />
                     </div>
                   </div>
                   
                   {/* Officer Info */}
                   <div className="px-4 sm:px-8 pb-6 sm:pb-8 text-center">
                     <div className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold rounded-full bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800 ring-2 ring-yellow-200 mb-3 sm:mb-4">
                       {federationOfficers[0].position}
                     </div>
                     <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">{federationOfficers[0].name}</h3>
                     <p className="text-gray-600 text-xs sm:text-sm font-medium">{federationOfficers[0].barangay}</p>
                   </div>
                 </div>
               </div>
             </div>

             {/* Vice President - Second Tier */}
             <div className="flex justify-center">
               <div className="group relative max-w-xs w-full">
                 <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-green-300/30 via-emerald-200/25 to-green-300/30 opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                 <div className="relative bg-white rounded-2xl shadow-lg ring-2 ring-green-200 overflow-hidden transition-all duration-300 group-hover:shadow-xl">
                   {/* Header with VP gradient */}
                   <div className="h-16 sm:h-20 bg-gradient-to-r from-green-500 to-emerald-600 relative">
                     <div className="absolute inset-0 bg-black/10"></div>
                   </div>
                   
                   {/* Profile Photo */}
                   <div className="relative -mt-10 sm:-mt-12 mb-3 sm:mb-4">
                     <div className="w-20 h-20 sm:w-28 sm:h-28 mx-auto rounded-full overflow-hidden ring-3 sm:ring-4 ring-white shadow-lg">
                       <img
                         src={`https://images.unsplash.com/photo-${1500000000000 + 1}?w=150&h=150&fit=crop&crop=face`}
                         alt={federationOfficers[1].name}
                         className="w-full h-full object-cover"
                         loading="lazy"
                       />
                     </div>
                   </div>
                   
                   {/* Officer Info */}
                   <div className="px-4 sm:px-6 pb-4 sm:pb-6 text-center">
                     <div className="inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-bold rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 ring-2 ring-green-200 mb-2 sm:mb-3">
                       {federationOfficers[1].position}
                     </div>
                     <h3 className="text-base sm:text-xl font-bold text-gray-900 mb-1">{federationOfficers[1].name}</h3>
                     <p className="text-gray-600 text-xs sm:text-sm font-medium">{federationOfficers[1].barangay}</p>
                   </div>
                 </div>
               </div>
             </div>

             {/* Other Officers - Third Tier */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
               {federationOfficers.slice(2).map((officer, index) => (
                 <div key={index + 2} className="group relative">
                   <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#24345A]/20 via-[#E7EBFF]/30 to-[#24345A]/20 opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
                   <div className="relative bg-white rounded-2xl shadow-md ring-1 ring-gray-200 overflow-hidden transition-all duration-300 group-hover:shadow-lg">
                     {/* Header with standard gradient */}
                     <div className="h-12 sm:h-16 bg-gradient-to-r from-[#24345A] to-[#E7EBFF] relative">
                       <div className="absolute inset-0 bg-black/10"></div>
                     </div>
                     
                     {/* Profile Photo */}
                     <div className="relative -mt-8 sm:-mt-10 mb-2 sm:mb-3">
                       <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full overflow-hidden ring-2 sm:ring-3 ring-white shadow-md">
                         <img
                           src={`https://images.unsplash.com/photo-${1500000000000 + index + 2}?w=150&h=150&fit=crop&crop=face`}
                           alt={officer.name}
                           className="w-full h-full object-cover"
                           loading="lazy"
                         />
                       </div>
                     </div>
                     
                     {/* Officer Info */}
                     <div className="px-3 sm:px-4 pb-3 sm:pb-4 text-center">
                       <div className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-gradient-to-r from-[#E7EBFF] to-[#F1E9FF] text-[#24345A] ring-1 ring-gray-200 mb-1 sm:mb-2">
                         {officer.position}
                       </div>
                       <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-1">{officer.name}</h3>
                       <p className="text-gray-600 text-[10px] sm:text-xs font-medium">{officer.barangay}</p>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           </div>
        </div>
      </section>

      {/* Contact Directory */}
      <section className="pt-8 pb-8 md:py-16 bg-white">
        <div 
          ref={directoryRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out delay-200 ${
            directoryVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3 lg:mb-4">Directory</div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4">SK Chairpersons & Contact Directory</h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-3xl">Find and contact SK Chairpersons across all barangays in San Jose, Batangas.</p>
          <div className="mt-4 sm:mt-5 mb-6 sm:mb-8 lg:mb-10 h-[1px] sm:h-[2px] w-full max-w-4xl bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full" aria-hidden="true" />

          {/* Search Bar */}
          <div className="mb-6 sm:mb-8">
            <div className="relative max-w-md mx-auto sm:mx-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Search by name or barangay..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#24345A]/20 focus:border-[#24345A] transition-colors text-sm sm:text-base"
              />
            </div>
          </div>

           {/* Contact Cards Grid */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
             {filteredChairpersons.map((person, index) => (
               <div key={index} className="group">
                 <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg ring-1 ring-gray-200 hover:shadow-xl transition-all duration-300 hover:ring-[#24345A]/30">
                   {/* Top Section with Photo and Basic Info */}
                   <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                     {/* Profile Photo */}
                     <div className="flex-shrink-0">
                       <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden ring-2 ring-[#24345A]/20 shadow-md">
                         <img
                           src={`https://images.unsplash.com/photo-${1600000000000 + index}?w=150&h=150&fit=crop&crop=face`}
                           alt={person.name}
                           className="w-full h-full object-cover"
                           loading="lazy"
                         />
                       </div>
                     </div>
                     
                     {/* Name and Position */}
                     <div className="flex-1 min-w-0">
                       <div className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs font-bold rounded-lg bg-[#24345A] text-white mb-1 sm:mb-2">
                         SK Chairperson
                       </div>
                       <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-1 truncate">{person.name}</h3>
                       <div className="flex items-center gap-1 sm:gap-1.5">
                         <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#24345A] flex-shrink-0" />
                         <span className="text-xs sm:text-sm text-gray-600 font-medium truncate">{person.barangay}</span>
                       </div>
                     </div>
                   </div>
                   
                   {/* Contact Section */}
                   <div className="bg-gradient-to-r from-[#E7EBFF] to-[#F1E9FF] rounded-xl sm:rounded-2xl p-3 sm:p-4 ring-1 ring-[#24345A]/10">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2 sm:gap-3">
                         <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#24345A] flex items-center justify-center">
                           <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                         </div>
                         <div>
                           <p className="text-[10px] sm:text-xs text-gray-600 font-medium">Contact Number</p>
                           <p className="text-xs sm:text-sm font-bold text-[#24345A]">{person.contact}</p>
                         </div>
                       </div>
                       <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/80 flex items-center justify-center shadow-sm">
                         <Phone className="w-3 h-3 sm:w-4 sm:h-4 text-[#24345A]" />
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </section>

      {/* Complete SK Officials List */}
      <section className="pt-8 pb-8 md:py-16 bg-white">
        <div 
          ref={completeListRef}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ease-out delay-300 ${
            completeListVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <div className="inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E7EBFF] text-[#24345A] text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3 lg:mb-4">Complete List</div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4">SK Officials Complete List</h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-3xl mx-auto">Browse the complete list of SK officials from all barangays. Click on any barangay card to view the detailed list of Chairperson and Councilors.</p>
            <div className="mt-4 sm:mt-5 h-[1px] sm:h-[2px] w-16 sm:w-20 lg:w-24 bg-gradient-to-r from-[#E7EBFF] via-[#F1E9FF] to-[#FDE7F1] opacity-90 rounded-full mx-auto" aria-hidden="true" />
          </div>

          {/* Search Bar */}
          <div className="mb-6 sm:mb-8">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Search by barangay, district, or official name..."
                value={officialsSearchTerm}
                onChange={(e) => setOfficialsSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#24345A]/20 focus:border-[#24345A] transition-colors text-sm sm:text-base"
              />
            </div>
            {officialsSearchTerm && (
              <div className="mt-2 text-center">
                <span className="text-xs sm:text-sm text-gray-600">
                  {filteredBarangayOfficials.length} result{filteredBarangayOfficials.length !== 1 ? 's' : ''} found
                </span>
              </div>
            )}
          </div>

          {/* Expandable Cards Grid */}
          {filteredBarangayOfficials.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredBarangayOfficials.map((barangay, index) => (
              <div 
                key={index} 
                className={`group bg-white rounded-2xl sm:rounded-3xl shadow-lg ring-1 ring-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:ring-[#24345A]/20 cursor-pointer ${
                  expandedCards[index] ? 'ring-[#24345A]/30 shadow-xl' : ''
                }`}
                onClick={() => toggleCard(index)}
              >
                {/* Card Header */}
                <div className="p-4 sm:p-6">
                  {/* Barangay Info */}
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[#24345A] flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-xl font-bold text-gray-900">{barangay.barangay}</h3>
                    </div>
                    <ChevronDown className={`w-5 h-5 sm:w-6 sm:h-6 text-gray-400 transition-transform duration-300 ${
                      expandedCards[index] ? 'rotate-180' : ''
                    }`} />
                  </div>
                </div>

                {/* Expanded Content */}
                <div className={`overflow-hidden transition-all duration-300 ease-out ${
                  expandedCards[index] ? 'max-h-[600px] sm:max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                    
                    {/* Chairperson Details */}
                    <div className="bg-purple-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 ring-1 ring-purple-200">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#24345A] flex items-center justify-center">
                          <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-700">SK Chairperson</p>
                          <p className="text-sm sm:text-lg font-bold text-[#24345A]">{barangay.chairperson}</p>
                        </div>
                      </div>
                    </div>

                    {/* Councilors */}
                    <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 ring-1 ring-gray-200">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#E7EBFF] flex items-center justify-center">
                          <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#24345A]" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-600">SK Councilors</p>
                          <p className="text-[10px] sm:text-xs text-gray-500">{barangay.councilors.length} members</p>
                        </div>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2 max-h-32 sm:max-h-48 overflow-y-auto">
                        {barangay.councilors.map((councilor, councilorIndex) => (
                          <div key={councilorIndex} className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 bg-white rounded-lg ring-1 ring-gray-100">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#24345A]/10 flex items-center justify-center flex-shrink-0">
                              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#24345A]"></div>
                            </div>
                            <span className="text-xs sm:text-sm font-medium text-gray-700">{councilor}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Search className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">No results found</h3>
              <p className="text-sm sm:text-base text-gray-600">Try searching with different keywords or check your spelling.</p>
            </div>
          )}
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
          <p className="text-gray-600 max-w-3xl">Need assistance or have questions? Contact the Local Youth Development Office.</p>
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
                  <Phone className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone</h3>
                <p className="text-gray-600 text-sm">+63 (43) 123-4567</p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-emerald-300/30 via-teal-200/25 to-sky-300/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" aria-hidden="true" />
              <div className="relative rounded-3xl p-6 bg-gray-50 ring-1 ring-gray-200 shadow-sm transition-transform duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl grid place-items-center bg-[#E7EBFF] text-[#24345A] ring-1 ring-gray-200 mb-4">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Office Hours</h3>
                <p className="text-gray-600 text-sm">Monday - Friday: 8:00 AM - 5:00 PM</p>
              </div>
            </div>
        </div>
      </div>
      </section>
    </PublicLayout>
  );
};

export default SKOfficials;
