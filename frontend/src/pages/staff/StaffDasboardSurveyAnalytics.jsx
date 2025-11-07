import React, { useMemo, useState, useEffect } from 'react';
import {
  Users,
  CheckCircle,
  UserCheck,
  Award,
  Activity,
  Heart,
  GraduationCap,
  Briefcase,
  MapPin,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Calendar,
  X,
  FileText
} from 'lucide-react';
import ActiveSurveyBanner from '../../components/portal_main_content/ActiveSurveyBanner';
import {
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  Legend as ReLegend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

/**
 * StaffDashboardSurveyAnalytics
 * Analytics component for displaying active survey batch analytics in the staff dashboard
 * Props:
 *  - responses: array of response objects from active survey batch
 *  - startDate: survey start date
 *  - endDate: survey end date
 *  - activeSurvey: active survey batch object
 */
const StaffDashboardSurveyAnalytics = ({ responses = [], startDate, endDate, activeSurvey }) => {
  const [locationFilter, setLocationFilter] = useState('all');
  const [modal, setModal] = useState({ open: false, section: null });

  const locations = useMemo(() => {
    return Array.from(new Set((responses || []).map(r => r.location || r.barangay || r.barangay_name).filter(Boolean)));
  }, [responses]);

  const filtered = useMemo(() => {
    if (locationFilter === 'all') return responses || [];
    return (responses || []).filter(r => (r.location || r.barangay || r.barangay_name) === locationFilter);
  }, [responses, locationFilter]);

  // Helpers
  const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

  const totals = useMemo(() => {
    const total = filtered.length;
    const validated = filtered.filter(r => (r.status || r.validationStatus || r.validation_status || '').toString().toLowerCase() === 'validated').length;
    const male = filtered.filter(r => (r.sexAtBirth || r.sex_at_birth || r.gender || '').toString().toLowerCase() === 'male').length;
    const female = filtered.filter(r => (r.sexAtBirth || r.sex_at_birth || r.gender || '').toString().toLowerCase() === 'female').length;
    const registered = filtered.filter(r => !!(r.registeredVoter ?? r.isRegisteredVoter ?? r.registered_SK_voter ?? r.registered_national_voter)).length;
    const attended = filtered.filter(r => !!(r.attendedKKAssembly ?? r.attended_KK_assembly ?? r.attended_kk_assembly)).length;

    const parseAgeFromGroup = (group) => {
      if (!group) return NaN;
      const m = String(group).match(/(\d{1,2})\s*[-–]\s*(\d{1,2})/);
      if (m) {
        const a = parseInt(m[1], 10), b = parseInt(m[2], 10);
        if (Number.isFinite(a) && Number.isFinite(b)) return (a + b) / 2;
      }
      const n = parseInt(String(group).replace(/[^0-9]/g, ''), 10);
      return Number.isFinite(n) ? n : NaN;
    };
    const calcAgeFromBirthday = (d) => {
      const date = d ? new Date(d) : null;
      if (!date || isNaN(date)) return NaN;
      const today = new Date();
      let age = today.getFullYear() - date.getFullYear();
      const m = today.getMonth() - date.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;
      return age;
    };
    const ages = (filtered || []).map(r => {
      const a = Number(r.age ?? r.Age ?? r.ageYears ?? r.age_years);
      if (Number.isFinite(a)) return a;
      const b = calcAgeFromBirthday(r.birthday ?? r.birthdate ?? r.dateOfBirth ?? r.dob ?? r.birth_date);
      if (Number.isFinite(b)) return b;
      const g = parseAgeFromGroup(r.youthAgeGroup || r.ageGroup || r.youth_age_group);
      return g;
    }).filter(n => Number.isFinite(n) && n > 0 && n < 120);
    const avgAge = ages.length ? (ages.reduce((s,n)=>s+n,0) / ages.length) : NaN;
    return {
      total,
      validated,
      validationRate: pct(validated, total),
      male,
      female,
      malePct: pct(male, total),
      femalePct: pct(female, total),
      registeredRate: pct(registered, total),
      attendanceRate: pct(attended, total),
      averageAge: Number.isFinite(avgAge) ? Number(avgAge.toFixed(1)) : null
    };
  }, [filtered]);

  // Responsive chart settings
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  useEffect(() => {
    const update = () => setIsSmallScreen(window.innerWidth < 640);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const axisTick = useMemo(() => ({ fontSize: isSmallScreen ? 10 : 12, fontWeight: 700 }), [isSmallScreen]);
  const xLabelAngle = isSmallScreen ? -30 : -45;
  const xLabelHeight = isSmallScreen ? 60 : 90;
  const pieOuterRadius = isSmallScreen ? 90 : 110;
  const chartHeight = isSmallScreen ? 230 : 300;
  const renderPieLabel = ({ name, value, percent, x, y, cx, cy, midAngle }) => {
    const text = `${name}: ${value}${totals.total ? ` (${(percent * 100).toFixed(0)}%)` : ''}`;
    return (
      <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{ fontSize: isSmallScreen ? 10 : 12, fontWeight: 600 }} fill="#374151">
        {text}
      </text>
    );
  };

  // Responsive legend renderer to prevent wrapping issues
  const truncateLegend = (label) => {
    const s = String(label ?? '');
    return isSmallScreen && s.length > 22 ? s.slice(0, 21) + '…' : s;
  };
  const renderLegend = (props) => {
    const payload = props?.payload || [];
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingTop: 8 }}>
        {payload.map((item) => (
          <div key={item?.value} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: isSmallScreen ? 10 : 12, color: '#374151', maxWidth: isSmallScreen ? 140 : 'none', whiteSpace: 'nowrap' }} title={String(item?.value || '')}>
            <span style={{ width: 10, height: 10, backgroundColor: item?.color, borderRadius: 2, display: 'inline-block' }} />
            <span>{truncateLegend(item?.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const getModalMeta = (section) => {
    switch (section) {
      case 'gender':
        return { title: 'Gender Distribution', subtitle: 'Male vs Female', grad: 'from-blue-50 to-indigo-50', Icon: Users, iconBg: 'bg-blue-100', iconColor: 'text-blue-600' };
      case 'age':
        return { title: 'Age Group Distribution', subtitle: 'Share by age brackets', grad: 'from-purple-50 to-pink-50', Icon: Users, iconBg: 'bg-purple-100', iconColor: 'text-purple-600' };
      case 'classification':
        return { title: 'Youth Classification', subtitle: 'Counts by classification', grad: 'from-green-50 to-emerald-50', Icon: Activity, iconBg: 'bg-green-100', iconColor: 'text-green-600' };
      case 'civil':
        return { title: 'Civil Status', subtitle: 'Distribution of statuses', grad: 'from-pink-50 to-rose-50', Icon: Heart, iconBg: 'bg-pink-100', iconColor: 'text-pink-600' };
      case 'education':
        return { title: 'Educational Attainment', subtitle: 'Top education levels', grad: 'from-indigo-50 to-blue-50', Icon: GraduationCap, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' };
      case 'work':
        return { title: 'Work Status', subtitle: 'Employment distribution', grad: 'from-orange-50 to-amber-50', Icon: Briefcase, iconBg: 'bg-orange-100', iconColor: 'text-orange-600' };
      case 'engagement':
        return { title: 'Civic Engagement Overview', subtitle: 'Participation indicators', grad: 'from-yellow-50 to-amber-50', Icon: Award, iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600' };
      case 'barangay':
        return { title: 'Response Distribution by Barangay', subtitle: 'Counts per barangay', grad: 'from-rose-50 to-red-50', Icon: MapPin, iconBg: 'bg-red-100', iconColor: 'text-red-600' };
      default:
        return { title: 'Detailed View', subtitle: '', grad: 'from-gray-50 to-gray-50', Icon: Activity, iconBg: 'bg-gray-100', iconColor: 'text-gray-600' };
    }
  };

  const countBy = (getter) => {
    const map = new Map();
    (filtered || []).forEach(r => {
      const key = getter(r) || 'Unknown';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  };

  const classification = useMemo(() => countBy(r => r.youthClassification || r.classification || r.youth_classification), [filtered]);
  const civilStatus = useMemo(() => countBy(r => r.civilStatus || r.civil_status), [filtered]);
  const ageGroups = useMemo(() => countBy(r => r.youthAgeGroup || r.ageGroup || r.youth_age_group), [filtered]);
  const education = useMemo(() => countBy(r => r.education || r.highestEducationalAttainment || r.educational_background).sort((a,b)=>b.value-a.value), [filtered]);
  const workStatus = useMemo(() => countBy(r => r.workStatus || r.employmentStatus || r.work_status), [filtered]);
  const barangays = useMemo(() => countBy(r => r.location || r.barangay || r.barangay_name).sort((a,b)=>b.value-a.value), [filtered]);

  // Chart helpers
  const COLORS = ['#3b82f6', '#ec4899', '#8b5cf6', '#f59e0b', '#10b981', '#6366f1', '#14b8a6', '#ef4444'];
  const pieLabel = ({ name, value, percent }) => `${name}: ${value}${totals.total ? ` (${(percent * 100).toFixed(0)}%)` : ''}`;
  const formatDate = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    if (isNaN(dt)) return null;
    return dt.toLocaleDateString();
  };

  if (!responses || responses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-sm text-gray-600 font-medium">No active survey data available</p>
          <p className="text-xs text-gray-500 mt-1">No active survey batch or responses found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Active Survey Banner */}
      <ActiveSurveyBanner
        activeSurvey={activeSurvey}
        hasActiveSurvey={!!activeSurvey}
        isLoading={false}
        onNavigateToActive={() => window.location.href = '/staff/survey/batches?filter=active'}
        onCreateSurvey={() => window.location.href = '/staff/survey/batches'}
        onViewSurvey={() => {
          if (activeSurvey) {
            const batchId = activeSurvey.batchId || activeSurvey.batch_id;
            window.location.href = `/staff/survey/batches/batch-report?batchId=${batchId}`;
          }
        }}
        variant="surveys"
      />

      {/* Header Stats Cards - align with portal card styling */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Responses */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-900">Total Responses</h4>
                <p className="text-[11px] text-gray-600">Survey participants</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900">{totals.total}</div>
              </div>
              <span className="px-2 py-1 text-xs rounded-lg bg-blue-50 text-blue-700 border border-blue-200">All</span>
            </div>
          </div>
        </div>

        {/* Average Age */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-900">Average Age</h4>
                <p className="text-[11px] text-gray-600">Mean respondent age</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-gray-900">{totals.averageAge ?? '—'}</div>
              <span className="px-2 py-1 text-xs rounded-lg bg-amber-50 text-amber-700 border border-amber-200">years</span>
            </div>
          </div>
        </div>

        {/* Voter Registration */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-900">Voter Registration</h4>
                <p className="text-[11px] text-gray-600">Registered SK voters</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-gray-900">{totals.registeredRate}%</div>
              <span className="px-2 py-1 text-xs rounded-lg bg-purple-50 text-purple-700 border border-purple-200">Rate</span>
            </div>
          </div>
        </div>

        {/* KK Attendance */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <Award className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-900">KK Attendance</h4>
                <p className="text-[11px] text-gray-600">Assembly participation</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-gray-900">{totals.attendanceRate}%</div>
              <span className="px-2 py-1 text-xs rounded-lg bg-orange-50 text-orange-700 border border-orange-200">Rate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gender & Age (Pie charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gender Pie */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition" onClick={()=>setModal({ open: true, section: 'gender' })}>
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Gender Distribution</h3>
                <p className="text-xs text-gray-600">Male vs Female</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <RePieChart>
                <Pie
                  data={[
                    { name: 'Male', value: totals.male },
                    { name: 'Female', value: totals.female }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={pieOuterRadius}
                  dataKey="value"
                  label={renderPieLabel}
                  labelLine={!isSmallScreen}
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#ec4899" />
                </Pie>
                <ReTooltip />
              </RePieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-2xl font-bold text-blue-900">{totals.male}</div>
                <div className="text-sm text-blue-700">Male ({totals.malePct}%)</div>
              </div>
              <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                <div className="text-2xl font-bold text-pink-900">{totals.female}</div>
                <div className="text-sm text-pink-700">Female ({totals.femalePct}%)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Age Group Pie */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition" onClick={()=>setModal({ open: true, section: 'age' })}>
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Age Group Distribution</h3>
                <p className="text-xs text-gray-600">Share by age brackets</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <RePieChart>
                <Pie
                  data={ageGroups}
                  cx="50%"
                  cy="50%"
                  outerRadius={pieOuterRadius}
                  dataKey="value"
                  label={renderPieLabel}
                  labelLine={!isSmallScreen}
                >
                  {ageGroups.map((entry, index) => (
                    <Cell key={`age-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                {!isSmallScreen && <ReLegend content={renderLegend} />}
                <ReTooltip />
              </RePieChart>
            </ResponsiveContainer>
            {isSmallScreen && (
              <div className="mt-2 space-y-1">
                {ageGroups.map((entry, index) => (
                  <div key={`age-legend-${index}`} className="flex items-center gap-2 text-gray-700 text-xs">
                    <span style={{ width: 10, height: 10, backgroundColor: COLORS[index % COLORS.length] }} className="inline-block rounded"></span>
                    <span className="truncate" title={`${entry.name}`}>{entry.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Classification & Civil Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classification */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition" onClick={()=>setModal({ open: true, section: 'classification' })}>
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Activity className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Youth Classification</h3>
                <p className="text-xs text-gray-600">Counts by classification</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={classification}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={xLabelAngle} textAnchor={isSmallScreen ? 'end' : 'end'} height={xLabelHeight} tick={axisTick} />
                <YAxis tick={axisTick} />
                <ReTooltip />
                <Bar dataKey="value" fill="#10b981" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Civil Status */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition" onClick={()=>setModal({ open: true, section: 'civil' })}>
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-rose-50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                <Heart className="w-4 h-4 text-pink-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Civil Status</h3>
                <p className="text-xs text-gray-600">Distribution of statuses</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            {civilStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={civilStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={xLabelAngle} textAnchor={isSmallScreen ? 'end' : 'end'} height={xLabelHeight} tick={axisTick} />
                  <YAxis tick={axisTick} />
                  <ReTooltip />
                  <Bar dataKey="value" fill="#ec4899" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-gray-500">No civil status data.</div>
            )}
          </div>
        </div>
      </div>

      {/* Education & Work */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Education */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition" onClick={()=>setModal({ open: true, section: 'education' })}>
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Educational Attainment</h3>
                <p className="text-xs text-gray-600">Top education levels</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={education}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={xLabelAngle} textAnchor={isSmallScreen ? 'end' : 'end'} height={xLabelHeight} tick={axisTick} />
                <YAxis tick={axisTick} />
                <ReTooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[8,8,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Work Status */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition" onClick={()=>setModal({ open: true, section: 'work' })}>
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Work Status</h3>
                <p className="text-xs text-gray-600">Employment distribution</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <RePieChart>
                <Pie data={workStatus} cx="50%" cy="50%" outerRadius={pieOuterRadius} dataKey="value" label={renderPieLabel} labelLine={!isSmallScreen}>
                  {workStatus.map((entry, index) => (
                    <Cell key={`ws-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                {!isSmallScreen && <ReLegend content={renderLegend} />}
                <ReTooltip />
              </RePieChart>
            </ResponsiveContainer>
            {isSmallScreen && (
              <div className="mt-2 space-y-1">
                {workStatus.map((entry, index) => (
                  <div key={`ws-legend-${index}`} className="flex items-center gap-2 text-gray-700 text-xs">
                    <span style={{ width: 10, height: 10, backgroundColor: COLORS[index % COLORS.length] }} className="inline-block rounded"></span>
                    <span className="truncate" title={`${entry.name}`}>{entry.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Engagement */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition" onClick={()=>setModal({ open: true, section: 'engagement' })}>
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-yellow-50 to-amber-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Award className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Civic Engagement Overview</h3>
              <p className="text-xs text-gray-600">Participation indicators</p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={[
              { name: 'Registered Voter', Yes: filtered.filter(r => !!(r.registeredVoter ?? r.isRegisteredVoter ?? r.registered_SK_voter ?? r.registered_national_voter)).length, No: totals.total - filtered.filter(r => !!(r.registeredVoter ?? r.isRegisteredVoter ?? r.registered_SK_voter ?? r.registered_national_voter)).length },
              { name: 'Voted Last Election', Yes: filtered.filter(r => !!(r.votedLastElection ?? r.voted_last_SK ?? r.voted_last_sk)).length, No: totals.total - filtered.filter(r => !!(r.votedLastElection ?? r.voted_last_SK ?? r.voted_last_sk)).length },
              { name: 'Attended KK Assembly', Yes: filtered.filter(r => !!(r.attendedKKAssembly ?? r.attended_KK_assembly ?? r.attended_kk_assembly)).length, No: totals.total - filtered.filter(r => !!(r.attendedKKAssembly ?? r.attended_KK_assembly ?? r.attended_kk_assembly)).length }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={axisTick} />
              <YAxis tick={axisTick} />
              <ReTooltip />
              <ReLegend content={renderLegend} />
              <Bar dataKey="Yes" fill="#10b981" radius={[8,8,0,0]} />
              <Bar dataKey="No" fill="#ef4444" radius={[8,8,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Barangay Distribution */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition" onClick={()=>setModal({ open: true, section: 'barangay' })}>
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50 to-red-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Response Distribution by Barangay</h3>
              <p className="text-xs text-gray-600">Counts per barangay</p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={barangays}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={xLabelAngle} textAnchor={isSmallScreen ? 'end' : 'end'} height={xLabelHeight} tick={axisTick} />
              <YAxis tick={axisTick} />
              <ReTooltip />
              <Bar dataKey="value" fill="#ef4444" radius={[8,8,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Key Insights</h3>
              <p className="text-xs text-gray-600">Auto-detected highlights</p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {totals.validationRate >= 75 && (
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">High Validation Rate</h4>
                    <p className="text-xs text-gray-600 mt-1">Strong data quality with {totals.validationRate}% validation rate</p>
                  </div>
                </div>
              </div>
            )}
            {totals.registeredRate < 60 && (
              <div className="bg-white rounded-lg p-4 border border-yellow-200">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">Voter Registration Gap</h4>
                    <p className="text-xs text-gray-600 mt-1">Only {totals.registeredRate}% registered - needs improvement</p>
                  </div>
                </div>
              </div>
            )}
            {totals.attendanceRate < 50 && (
              <div className="bg-white rounded-lg p-4 border border-orange-200">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                    <TrendingDown className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">Low KK Participation</h4>
                    <p className="text-xs text-gray-600 mt-1">Only {totals.attendanceRate}% attendance - boost engagement</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60" onClick={()=>setModal({ open:false, section:null })}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl border border-gray-200 overflow-hidden" onClick={(e)=>e.stopPropagation()}>
            {(() => { const meta = getModalMeta(modal.section); const IconComp = meta.Icon; return (
              <div className={`px-5 py-4 border-b border-gray-100 bg-gradient-to-r ${meta.grad}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg ${meta.iconBg} flex items-center justify-center`}>
                      <IconComp className={`w-4 h-4 ${meta.iconColor}`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{meta.title}</h3>
                      {meta.subtitle && <p className="text-xs text-gray-600">{meta.subtitle}</p>}
                    </div>
                  </div>
                  <button aria-label="Close" className="p-2 rounded-lg text-gray-600 hover:bg-gray-100" onClick={()=>setModal({ open:false, section:null })}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ); })()}
            
            <div className="p-5">
              {modal.section === 'gender' && (
                <ResponsiveContainer width="100%" height={420}>
                  <RePieChart>
                    <Pie data={[{ name:'Male', value: totals.male },{ name:'Female', value: totals.female }]} cx="50%" cy="50%" outerRadius={150} dataKey="value" label={renderPieLabel} labelLine>
                      <Cell fill="#3b82f6" />
                      <Cell fill="#ec4899" />
                    </Pie>
                    <ReLegend content={renderLegend} />
                    <ReTooltip />
                  </RePieChart>
                </ResponsiveContainer>
              )}
              {modal.section === 'age' && (
                <ResponsiveContainer width="100%" height={420}>
                  <RePieChart>
                    <Pie data={ageGroups} cx="50%" cy="50%" outerRadius={150} dataKey="value" label={renderPieLabel} labelLine>
                      {ageGroups.map((e,i)=>(<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                    </Pie>
                    <ReLegend content={renderLegend} />
                    <ReTooltip />
                  </RePieChart>
                </ResponsiveContainer>
              )}
              {modal.section === 'classification' && (
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart data={classification}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} tick={{ fontSize: 12, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 12, fontWeight: 700 }} />
                    <ReTooltip />
                    <Bar dataKey="value" fill="#10b981" radius={[8,8,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {modal.section === 'civil' && (
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart data={civilStatus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} tick={{ fontSize: 12, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 12, fontWeight: 700 }} />
                    <ReTooltip />
                    <Bar dataKey="value" fill="#ec4899" radius={[8,8,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {modal.section === 'education' && (
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart data={education}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} tick={{ fontSize: 12, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 12, fontWeight: 700 }} />
                    <ReTooltip />
                    <Bar dataKey="value" fill="#6366f1" radius={[8,8,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {modal.section === 'work' && (
                <ResponsiveContainer width="100%" height={420}>
                  <RePieChart>
                    <Pie data={workStatus} cx="50%" cy="50%" outerRadius={150} dataKey="value" label={renderPieLabel} labelLine>
                      {workStatus.map((e,i)=>(<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                    </Pie>
                    <ReLegend content={renderLegend} />
                    <ReTooltip />
                  </RePieChart>
                </ResponsiveContainer>
              )}
              {modal.section === 'engagement' && (
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart data={[
                    { name: 'Registered Voter', Yes: filtered.filter(r => !!(r.registeredVoter ?? r.isRegisteredVoter ?? r.registered_SK_voter ?? r.registered_national_voter)).length, No: totals.total - filtered.filter(r => !!(r.registeredVoter ?? r.isRegisteredVoter ?? r.registered_SK_voter ?? r.registered_national_voter)).length },
                    { name: 'Voted Last Election', Yes: filtered.filter(r => !!(r.votedLastElection ?? r.voted_last_SK ?? r.voted_last_sk)).length, No: totals.total - filtered.filter(r => !!(r.votedLastElection ?? r.voted_last_SK ?? r.voted_last_sk)).length },
                    { name: 'Attended KK Assembly', Yes: filtered.filter(r => !!(r.attendedKKAssembly ?? r.attended_KK_assembly ?? r.attended_kk_assembly)).length, No: totals.total - filtered.filter(r => !!(r.attendedKKAssembly ?? r.attended_KK_assembly ?? r.attended_kk_assembly)).length }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 12, fontWeight: 700 }} />
                    <ReLegend content={renderLegend} />
                    <ReTooltip />
                    <Bar dataKey="Yes" fill="#10b981" radius={[8,8,0,0]} />
                    <Bar dataKey="No" fill="#ef4444" radius={[8,8,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {modal.section === 'barangay' && (
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart data={barangays}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} tick={{ fontSize: 12, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 12, fontWeight: 700 }} />
                    <ReTooltip />
                    <Bar dataKey="value" fill="#ef4444" radius={[8,8,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboardSurveyAnalytics;

