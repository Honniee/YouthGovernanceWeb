/**
 * Segment Analysis Service
 * Analyzes each cluster to create meaningful segment profiles
 * 
 * Transforms raw clusters into actionable youth segments with:
 * - Descriptive names
 * - Demographic profiles
 * - Priority levels
 * - Key characteristics
 */

class SegmentAnalysisService {

  /**
   * Analyze a single cluster to create a segment profile
   * @param {Number} clusterNum - Cluster number (0, 1, 2, ...)
   * @param {Array} responses - Survey responses in this cluster
   * @param {Array} metadata - Metadata for youth in this cluster
   * @param {Array} features - Feature vectors for this cluster
   * @param {Array} centroid - Cluster center point
   * @param {Number} totalYouth - Total number of youth across all clusters
   */
  async analyzeSegment(clusterNum, responses, metadata, features, centroid, totalYouth) {
    console.log(`\n📊 Analyzing Cluster ${clusterNum}...`);
    
    // Calculate demographics
    const avgAge = this.calculateAverage(metadata.map(m => m.raw_age));
    const avgEducation = this.calculateAverageEducation(metadata);
    const employmentRate = this.calculateEmploymentRate(metadata);
    const civicEngagement = this.calculateCivicEngagement(metadata);
    
    // Gender distribution
    const genderDist = this.calculateDistribution(metadata, 'raw_gender');
    
    // Education distribution
    const educationDist = this.calculateDistribution(metadata, 'raw_education');
    
    // Work status distribution
    const workDist = this.calculateDistribution(metadata, 'raw_work_status');
    
    // Civil status distribution
    const civilDist = this.calculateDistribution(metadata, 'raw_civil_status');
    
    // Identify segment characteristics
    const characteristics = {
      demographics: {
        avgAge: parseFloat(avgAge.toFixed(1)),
        ageRange: `${Math.min(...metadata.map(m => m.raw_age))} - ${Math.max(...metadata.map(m => m.raw_age))} years`,
        genderDistribution: genderDist,
        registeredSK: metadata.filter(m => m.raw_civic_score >= 1).length,
        attendedKK: metadata.filter(m => m.raw_civic_score >= 2).length
      },
      education: {
        avgLevel: parseFloat(avgEducation.toFixed(2)),
        distribution: educationDist,
        dominantLevel: this.getDominant(educationDist)
      },
      employment: {
        employmentRate: parseFloat((employmentRate * 100).toFixed(1)),
        distribution: workDist,
        dominantStatus: this.getDominant(workDist)
      },
      civicEngagement: {
        engagementRate: parseFloat((civicEngagement * 100).toFixed(1)),
        avgActivities: parseFloat((civicEngagement * 4).toFixed(1)), // 0-4 scale
        registeredSK: metadata.filter(m => m.raw_civic_score >= 1).length,
        attendedKK: metadata.filter(m => m.raw_civic_score >= 2).length
      },
      civilStatus: {
        distribution: civilDist,
        dominantStatus: this.getDominant(civilDist)
      }
    };

    // Generate segment name and description
    const { name, description } = this.generateSegmentIdentity(
      clusterNum,
      characteristics,
      responses.length
    );

    // Determine priority level
    const priority = this.determinePriority(characteristics, responses.length);

    // Calculate percentage - NOW FIXED!
    const percentage = parseFloat(((responses.length / totalYouth) * 100).toFixed(2));

    // Create segment profile
    const segment = {
      clusterNumber: clusterNum,
      name,
      description,
      youthCount: responses.length,
      percentage, // Placeholder - will be updated by caller
      
      // Aggregated metrics
      avgAge,
      avgEducation,
      employmentRate,
      civicEngagement,
      
      // Detailed characteristics
      characteristics,
      
      // Priority
      priority,
      
      // Centroid (for distance calculations)
      centroid,
      
      // Quality
      qualityScore: this.calculateCohesion(features)
    };

    console.log(`   Name: ${name}`);
    console.log(`   Youth Count: ${responses.length}`);
    console.log(`   Priority: ${priority}`);

    return segment;
  }

  /**
   * Calculate average of numeric array
   */
  calculateAverage(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate average education level (0-10 scale)
   */
  calculateAverageEducation(metadata) {
    const educationScores = metadata.map(m => this.mapEducationToScore(m.raw_education));
    return this.calculateAverage(educationScores);
  }

  /**
   * Map education level to numeric score
   */
  mapEducationToScore(education) {
    const mapping = {
      'Elementary Level': 1,
      'Elementary Grad': 2,
      'High School Level': 3,
      'High School Grad': 4,
      'Vocational Grad': 5,
      'College Level': 6,
      'College Grad': 7,
      'Masters Level': 8,
      'Masters Grad': 9,
      'Doctorate Level': 9,
      'Doctorate Graduate': 10
    };
    return mapping[education] || 0;
  }

  /**
   * Calculate employment rate
   */
  calculateEmploymentRate(metadata) {
    const employed = metadata.filter(m => 
      m.raw_work_status === 'Employed' || m.raw_work_status === 'Self-Employed'
    ).length;
    return employed / metadata.length;
  }

  /**
   * Calculate civic engagement rate
   */
  calculateCivicEngagement(metadata) {
    const totalScore = metadata.reduce((sum, m) => sum + m.raw_civic_score, 0);
    const maxPossible = metadata.length * 6; // Max: 4 base activities + 2 attendance bonus
    return totalScore / maxPossible;
  }

  /**
   * Calculate distribution of a field
   */
  calculateDistribution(metadata, field) {
    const counts = {};
    const total = metadata.length;
    
    metadata.forEach(m => {
      const value = m[field];
      counts[value] = (counts[value] || 0) + 1;
    });

    const distribution = {};
    Object.keys(counts).forEach(key => {
      distribution[key] = {
        count: counts[key],
        percentage: parseFloat(((counts[key] / total) * 100).toFixed(1))
      };
    });

    return distribution;
  }

  /**
   * Get dominant value from distribution
   */
  getDominant(distribution) {
    let maxCount = 0;
    let dominant = 'Unknown';
    
    Object.keys(distribution).forEach(key => {
      if (distribution[key].count > maxCount) {
        maxCount = distribution[key].count;
        dominant = key;
      }
    });

    return dominant;
  }

  /**
   * Generate segment name and description
   */
  generateSegmentIdentity(clusterNum, chars, count) {
    const { education, employment, civicEngagement, demographics } = chars;

    // Calculate composite scores (0-100 scale)
    const educationScore = (education.avgLevel / 10) * 100;
    const employmentScore = employment.employmentRate; // Already stored as percentage (0-100)
    const engagementScore = civicEngagement.engagementRate; // Already stored as percentage (0-100)
    const ageScore = demographics.avgAge;

    // Determine primary characteristics (more nuanced thresholds)
    const educationLevel = educationScore >= 70 ? 'high' : educationScore >= 40 ? 'medium' : 'low';
    const employmentLevel = employmentScore >= 60 ? 'high' : employmentScore >= 30 ? 'medium' : 'low';
    const engagementLevel = engagementScore >= 60 ? 'high' : engagementScore >= 40 ? 'medium' : 'low';
    const ageCategory = ageScore < 18 ? 'teen' : ageScore < 22 ? 'young' : ageScore < 27 ? 'mid' : 'mature';

    // Generate name based on dominant characteristics
    let name = '';
    let description = '';

    // Create a unique identifier based on the combination
    const profile = `${educationLevel}-${employmentLevel}-${engagementLevel}-${ageCategory}`;

    // Strategy: Use age + employment + education combination to create unique segments
    
    // High education + High employment
    if (educationLevel === 'high' && employmentLevel === 'high') {
      name = 'Established Professionals';
      description = `Elite segment: College graduates with stable employment (${employmentScore.toFixed(0)}% employed, avg ${ageScore.toFixed(1)} yrs, ${engagementScore.toFixed(0)}% civic engagement). These ${count} youth represent successful outcomes of education-to-employment pathways. KEY INSIGHT: They are self-sufficient but ${engagementScore < 40 ? 'disconnected from community governance' : 'actively engaged in civic life'}. This group should be ${engagementScore < 40 ? 'recruited for youth leadership roles and policy consultation' : 'recognized as role models and invited to mentor other segments'}. Recommend: Youth advisory board positions, corporate social responsibility partnerships, alumni mentorship programs.`;
    }
    // High education + Medium/Low employment
    else if (educationLevel === 'high' && employmentLevel !== 'high') {
      name = 'Educated Job Seekers';
      description = `College graduates facing underemployment crisis (${educationLevel} education, ${employmentScore.toFixed(0)}% employed, avg ${ageScore.toFixed(1)} yrs). ${count} highly qualified youth unable to find suitable jobs despite credentials. KEY INSIGHT: This is skills-mismatch unemployment - they have degrees but no matching opportunities. Risk of brain drain if not addressed. Civic engagement: ${engagementScore.toFixed(0)}%. Recommend: Industry partnerships for graduate hiring programs, upskilling for in-demand careers (IT, digital marketing), entrepreneurship support, government fast-track hiring for qualified positions.`;
    }
    // High employment (regardless of education)
    else if (employmentLevel === 'high') {
      name = 'Active Workforce Youth';
      description = `Economically stable and professionally active (${employmentScore.toFixed(0)}% employment rate, ${educationLevel} education, avg ${ageScore.toFixed(1)} yrs). These ${count} employed youth show ${engagementScore.toFixed(0)}% civic engagement. KEY INSIGHT: ${engagementScore < 50 ? 'Lower civic engagement suggests work-life balance challenges. They are busy with careers but disconnected from community governance.' : 'Balanced work-community participation - ideal candidates for SK leadership roles and youth development mentorship.'} Recommend: ${engagementScore < 50 ? 'Workplace-based civic programs, flexible volunteer opportunities, employer partnerships for CSR activities.' : 'Youth council positions, mentorship programs for unemployed youth, peer-to-peer skills training initiatives.'}`;
    }
    // Medium employment + High civic engagement
    else if (employmentLevel === 'medium' && engagementLevel === 'high') {
      name = 'Civic-Engaged Workers';
      description = `Employed and civically active youth (${employmentScore.toFixed(0)}% employed, ${engagementScore.toFixed(0)}% engaged). ${count} members balancing work and community.`;
    }
    // Medium employment + Younger age (under 22)
    else if (employmentLevel === 'medium' && ageCategory === 'young') {
      name = 'Emerging Workforce';
      description = `Young employed individuals (avg ${ageScore.toFixed(1)} yrs, ${employmentScore.toFixed(0)}% employed). ${count} members building early careers.`;
    }
    // Medium employment + Older age (22+)
    else if (employmentLevel === 'medium' && (ageCategory === 'mid' || ageCategory === 'mature')) {
      name = 'Experienced Job Seekers';
      description = `Mature youth with work experience (avg ${ageScore.toFixed(1)} yrs, ${employmentScore.toFixed(0)}% employed). ${count} members seeking stable careers.`;
    }
    // Low employment + High civic engagement
    else if (employmentLevel === 'low' && engagementLevel === 'high') {
      name = 'Civic-Minded Youth';
      description = `Highly engaged in community governance (${engagementScore.toFixed(0)}% civic participation - attending KK Assemblies 5+ times, registered SK voters). Despite ${employmentScore.toFixed(0)}% employment, these ${count} youth (avg ${ageScore.toFixed(1)} yrs, ${educationLevel} education) demonstrate strong leadership potential and community commitment. KEY INSIGHT: High civic engagement but unemployed suggests they need job opportunities that leverage their leadership skills and community connection. Recommend: Youth leadership programs with employment pathways, government internships, community organizing roles.`;
    }
    // Low employment + Medium/High education
    else if (employmentLevel === 'low' && educationLevel !== 'low') {
      name = 'Opportunity Seekers';
      description = `Educated but underemployed youth (${employmentScore.toFixed(0)}% employment despite ${educationLevel} education, ${engagementScore.toFixed(0)}% civic engagement). These ${count} youth (avg ${ageScore.toFixed(1)} yrs) have completed their education but face employment barriers. KEY INSIGHT: Low civic engagement (${engagementScore.toFixed(0)}%) suggests they're focused on job hunting rather than community activities. This is a critical window - without intervention, they risk prolonged unemployment and disengagement. Recommend: Targeted job fairs, skills training aligned with local industries, resume workshops, employer partnerships for fresh graduate placement.`;
    }
    // Young + Low employment
    else if (ageCategory === 'teen' || ageCategory === 'young') {
      if (employmentScore < 10) {
        name = 'Student Youth';
        description = `Currently enrolled students (avg ${ageScore.toFixed(1)} yrs, ${employmentScore.toFixed(0)}% employed, ${educationLevel} education level). ${count} youth focused on completing their education. Civic engagement: ${engagementScore.toFixed(0)}%. KEY INSIGHT: This is the PREVENTION stage - they're still in school, which is ideal. High civic engagement (${engagementScore.toFixed(0)}%) indicates good community connection. Priority: Keep them in school and prepare for employment transition. Recommend: Career guidance programs, scholarship support, school-to-work transition programs, youth leadership training to build soft skills early.`;
      } else if (employmentScore < 25) {
        name = 'Early-Stage Youth';
        description = `Young adults (avg ${ageScore.toFixed(1)} yrs) with minimal employment exposure (${employmentScore.toFixed(0)}% employed, ${educationLevel} education). ${count} youth at a critical transition phase between school and work. Civic engagement: ${engagementScore.toFixed(0)}%. KEY INSIGHT: This is a VULNERABLE period - not fully employed, possibly out of school, at risk of becoming NEET (Not in Education, Employment, or Training). Requires urgent intervention. Recommend: First-time job seeker programs, internship placements, resume building workshops, motivation/life skills training.`;
      } else {
        name = 'Youth Job Starters';
        description = `Young workers gaining initial work experience (avg ${ageScore.toFixed(1)} yrs, ${employmentScore.toFixed(0)}% employed, ${educationLevel} education). ${count} youth successfully navigating early career phase. Civic engagement: ${engagementScore.toFixed(0)}%. KEY INSIGHT: Positive trajectory - they've secured entry-level jobs and are building experience. Support now will help them advance. Recommend: Skills upgrading programs (upskilling/reskilling), career advancement coaching, entrepreneurship training for those wanting to start businesses.`;
      }
    }
    // Low everything
    else if (educationLevel === 'low' && employmentLevel === 'low' && engagementLevel === 'low') {
      name = 'High-Need Youth';
      description = `CRITICAL PRIORITY segment: Triple disadvantage - low education (${educationLevel}), unemployed (${employmentScore.toFixed(0)}% employed), and disengaged from community (${engagementScore.toFixed(0)}% civic participation). ${count} youth (avg ${ageScore.toFixed(1)} yrs) facing multiple barriers. KEY INSIGHT: This group is at highest risk of long-term marginalization, poverty, and social exclusion. They are likely INVISIBLE in current systems - not attending meetings, not registered voters, not participating. Immediate holistic intervention required. Recommend: Outreach programs to locate and engage, alternative learning system (ALS), livelihood training with guaranteed placement, mental health/psychosocial support, case management approach with dedicated youth workers.`;
    }
    // Fallback: Create unique name based on cluster characteristics
    else {
      // Use employment rate to differentiate
      if (employmentScore >= 45) {
        name = 'Working Youth';
        description = `Employed youth with practical skills (${employmentScore.toFixed(0)}% employed). ${count} members balancing work and upskilling.`;
      } else if (employmentScore >= 35) {
        name = 'Part-Time Workers';
        description = `Youth with partial employment (${employmentScore.toFixed(0)}% employed). ${count} members seeking full-time opportunities.`;
      } else if (employmentScore >= 25) {
        name = 'Job-Ready Youth';
        description = `Youth prepared for employment (${employmentScore.toFixed(0)}% currently employed). ${count} members needing job connections.`;
      } else {
        name = `Youth Group ${String.fromCharCode(65 + clusterNum)}`;
        description = `Diverse group of ${count} youth (avg age ${ageScore.toFixed(1)}, ${employmentScore.toFixed(0)}% employed).`;
      }
    }

    return { name, description };
  }

  /**
   * Determine priority level based on needs
   */
  determinePriority(chars, count) {
    const { employment, education, civicEngagement } = chars;

    // High priority: Unemployed + Low education + Low engagement
    if (employment.employmentRate < 0.3 && education.avgLevel < 4 && civicEngagement.engagementRate < 30) {
      return 'high';
    }

    // Medium priority: Either unemployed OR low education
    if (employment.employmentRate < 0.5 || education.avgLevel < 5) {
      return 'medium';
    }

    // Low priority: Generally doing well
    return 'low';
  }

  /**
   * Calculate cluster cohesion (how tight the cluster is)
   */
  calculateCohesion(features) {
    if (features.length < 2) return 1.0;

    // Calculate centroid of this cluster
    const dimensions = features[0].length;
    const centroid = new Array(dimensions).fill(0);
    
    features.forEach(feature => {
      feature.forEach((val, dim) => {
        centroid[dim] += val;
      });
    });
    
    centroid.forEach((_, dim) => {
      centroid[dim] /= features.length;
    });

    // Calculate average distance to centroid
    let totalDistance = 0;
    features.forEach(feature => {
      const distance = Math.sqrt(
        feature.reduce((sum, val, dim) => {
          return sum + Math.pow(val - centroid[dim], 2);
        }, 0)
      );
      totalDistance += distance;
    });

    const avgDistance = totalDistance / features.length;
    
    // Convert to 0-1 score (lower distance = higher cohesion)
    // Normalize assuming max possible distance is sqrt(dimensions) (all features at opposite extremes)
    const maxDistance = Math.sqrt(dimensions);
    const cohesionScore = 1 - (avgDistance / maxDistance);
    
    return Math.max(0, Math.min(1, cohesionScore));
  }
}

// Export singleton instance
export default new SegmentAnalysisService();

