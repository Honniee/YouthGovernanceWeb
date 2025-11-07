/**
 * Recommendation Service
 * Generates personalized program recommendations for each youth segment
 * 
 * Uses rule-based logic to match segment characteristics with:
 * - Program types (Employment, Education, Skills, Civic)
 * - Target needs
 * - SDG alignment
 * - Expected impact
 */

class RecommendationService {

  /**
   * Generate program recommendations for a segment
   * @param {Object} segment - Segment profile from segmentAnalysisService
   * @returns {Array} Array of program recommendations
   */
  async generateForSegment(segment) {
    console.log(`\n💡 Generating recommendations for: ${segment.name}`);
    
    const recommendations = [];
    const { characteristics, youthCount } = segment;

    // Analyze segment needs
    const needs = this.analyzeNeeds(characteristics);
    
    // Generate recommendations based on needs
    if (needs.employment.isHigh) {
      recommendations.push(...this.getEmploymentPrograms(segment, needs.employment));
    }

    if (needs.education.isHigh) {
      recommendations.push(...this.getEducationPrograms(segment, needs.education));
    }

    if (needs.skills.isHigh) {
      recommendations.push(...this.getSkillsPrograms(segment, needs.skills));
    }

    if (needs.civic.isLow) {
      recommendations.push(...this.getCivicPrograms(segment, needs.civic));
    }

    // Add segment metadata to each recommendation
    recommendations.forEach((rec, index) => {
      rec.segmentId = segment.segmentId; // Will be set by caller
      rec.priorityRank = index + 1;
      rec.targetYouthCount = Math.ceil(youthCount * 0.7); // Target 70% of segment
    });

    console.log(`   Generated ${recommendations.length} recommendations`);
    
    return recommendations;
  }

  /**
   * Analyze segment needs
   */
  analyzeNeeds(chars) {
    return {
      employment: {
        isHigh: chars.employment.employmentRate < 50,
        rate: chars.employment.employmentRate,
        dominantStatus: chars.employment.dominantStatus
      },
      education: {
        isHigh: chars.education.avgLevel < 5, // Below vocational
        avgLevel: chars.education.avgLevel,
        dominantLevel: chars.education.dominantLevel
      },
      skills: {
        isHigh: chars.employment.employmentRate < 50 && chars.education.avgLevel < 6,
        reason: 'Low employment + education'
      },
      civic: {
        isLow: chars.civicEngagement.engagementRate < 40,
        rate: chars.civicEngagement.engagementRate
      }
    };
  }

  /**
   * Get employment-focused programs
   */
  getEmploymentPrograms(segment, need) {
    const programs = [];

    if (need.dominantStatus === 'Unemployed' || need.dominantStatus === 'Currently looking for a Job') {
      programs.push({
        programName: 'Youth Employment Readiness Program',
        programType: 'Employment',
        description: 'Comprehensive job readiness training including resume writing, interview skills, and workplace etiquette.',
        targetNeed: 'Job Readiness',
        expectedImpact: 'high',
        durationMonths: 3,
        implementationPlan: '1) Conduct skills assessment, 2) Provide training modules, 3) Connect with local employers, 4) Facilitate job placements',
        successMetrics: {
          placementRate: '60% employed within 6 months',
          skillsImprovement: '80% pass job readiness assessment',
          employerSatisfaction: '75% employer satisfaction rate'
        },
        primarySDG: 'SDG 8: Decent Work and Economic Growth',
        sdgAlignment: 85
      });

      programs.push({
        programName: 'Local Job Matching & Placement Service',
        programType: 'Employment',
        description: 'Connect youth with local employment opportunities through partnerships with businesses and government agencies.',
        targetNeed: 'Job Placement',
        expectedImpact: 'high',
        durationMonths: 6,
        implementationPlan: '1) Partner with local businesses, 2) Create job portal, 3) Organize job fairs, 4) Provide follow-up support',
        successMetrics: {
          partnerships: '20+ local employers engaged',
          placements: '50+ youth employed',
          retention: '70% still employed after 6 months'
        },
        primarySDG: 'SDG 8: Decent Work and Economic Growth',
        sdgAlignment: 90
      });
    }

    if (need.dominantStatus === 'Self-Employed') {
      programs.push({
        programName: 'Livelihood & Entrepreneurship Support',
        programType: 'Employment',
        description: 'Support for self-employed youth through business training, microloans, and mentorship.',
        targetNeed: 'Business Development',
        expectedImpact: 'medium',
        durationMonths: 12,
        implementationPlan: '1) Entrepreneurship training, 2) Business plan development, 3) Connect with microfinance, 4) Provide mentorship',
        successMetrics: {
          businessSurvival: '70% businesses still operating after 1 year',
          incomeIncrease: '40% increase in average income',
          jobsCreated: 'Average 2 jobs created per business'
        },
        primarySDG: 'SDG 8: Decent Work and Economic Growth',
        sdgAlignment: 80
      });
    }

    return programs;
  }

  /**
   * Get education-focused programs
   */
  getEducationPrograms(segment, need) {
    const programs = [];

    if (need.avgLevel < 4) { // Below high school grad
      programs.push({
        programName: 'Alternative Learning System (ALS) Support',
        programType: 'Education',
        description: 'Support for out-of-school youth to complete basic education through the Alternative Learning System.',
        targetNeed: 'Basic Education',
        expectedImpact: 'high',
        durationMonths: 12,
        implementationPlan: '1) Identify OSY, 2) Provide ALS materials and tutoring, 3) Facilitate ALS exams, 4) Track completion',
        successMetrics: {
          enrollment: '80% of targeted OSY enrolled',
          completion: '70% complete ALS',
          passRate: '85% pass ALS exam'
        },
        primarySDG: 'SDG 4: Quality Education',
        sdgAlignment: 95
      });
    }

    if (need.avgLevel >= 4 && need.avgLevel < 7) { // High school grad to college level
      programs.push({
        programName: 'Scholarship & Financial Aid Program',
        programType: 'Education',
        description: 'Financial assistance for deserving youth to pursue higher education or vocational training.',
        targetNeed: 'Higher Education Access',
        expectedImpact: 'high',
        durationMonths: 24,
        implementationPlan: '1) Establish scholarship criteria, 2) Partner with schools, 3) Provide financial support, 4) Monitor academic progress',
        successMetrics: {
          scholarships: '30+ scholarships awarded',
          retention: '80% maintain good academic standing',
          graduation: '75% complete their program'
        },
        primarySDG: 'SDG 4: Quality Education',
        sdgAlignment: 90
      });
    }

    return programs;
  }

  /**
   * Get skills development programs
   */
  getSkillsPrograms(segment, need) {
    const programs = [];

    programs.push({
      programName: 'Technical-Vocational Skills Training',
      programType: 'Skills Development',
      description: 'Hands-on training in in-demand skills such as ICT, welding, electronics, food service, and care-giving.',
      targetNeed: 'Marketable Skills',
      expectedImpact: 'high',
      durationMonths: 6,
      implementationPlan: '1) Conduct labor market analysis, 2) Partner with TESDA, 3) Deliver training courses, 4) Facilitate certification',
      successMetrics: {
        trained: '100+ youth trained',
        certified: '85% obtain TESDA certification',
        employed: '65% employed within 3 months'
      },
      primarySDG: 'SDG 4: Quality Education',
      sdgAlignment: 85
    });

    programs.push({
      programName: 'Digital Literacy & ICT Training',
      programType: 'Skills Development',
      description: 'Basic to intermediate computer skills, online tools, and digital citizenship for the modern workforce.',
      targetNeed: 'Digital Skills',
      expectedImpact: 'medium',
      durationMonths: 3,
      implementationPlan: '1) Setup computer lab or mobile training, 2) Develop curriculum, 3) Conduct training sessions, 4) Assess competency',
      successMetrics: {
        participants: '150+ youth trained',
        competency: '80% pass digital literacy assessment',
        application: '60% use digital skills in work/study'
      },
      primarySDG: 'SDG 4: Quality Education',
      sdgAlignment: 75
    });

    return programs;
  }

  /**
   * Get civic engagement programs
   */
  getCivicPrograms(segment, need) {
    const programs = [];

    programs.push({
      programName: 'Youth Leadership & Civic Engagement Program',
      programType: 'Civic Engagement',
      description: 'Develop youth leadership skills and encourage active participation in community activities and governance.',
      targetNeed: 'Civic Participation',
      expectedImpact: 'medium',
      durationMonths: 6,
      implementationPlan: '1) Leadership training workshops, 2) Community service projects, 3) SK and barangay participation, 4) Recognition program',
      successMetrics: {
        participants: '80+ youth engaged',
        projects: '10+ community projects implemented',
        continued: '50% continue civic activities after program'
      },
      primarySDG: 'SDG 16: Peace, Justice and Strong Institutions',
      sdgAlignment: 80
    });

    programs.push({
      programName: 'Volunteer & Community Service Initiative',
      programType: 'Civic Engagement',
      description: 'Mobilize youth for community service activities addressing local needs and building social cohesion.',
      targetNeed: 'Community Involvement',
      expectedImpact: 'low',
      durationMonths: 12,
      implementationPlan: '1) Identify community needs, 2) Organize volunteer activities, 3) Recognize volunteers, 4) Build sustained engagement',
      successMetrics: {
        volunteers: '200+ youth volunteers',
        hours: '5,000+ volunteer hours',
        projects: '15+ community initiatives'
      },
      primarySDG: 'SDG 11: Sustainable Cities and Communities',
      sdgAlignment: 70
    });

    return programs;
  }
}

// Export singleton instance
export default new RecommendationService();

