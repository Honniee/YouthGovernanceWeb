import { useState, useCallback, useEffect } from 'react';
import { useActiveSurvey } from './useActiveSurvey';
import { useYouthProfile } from './useYouthProfile';
import { useSurveyAutoSave } from './useSurveyAutoSave';

/**
 * Comprehensive survey session management hook
 * Combines youth profile management and survey auto-save functionality
 */
export const useSurveySession = () => {
  const { activeSurvey, hasActiveSurvey, isLoading: surveyLoading } = useActiveSurvey();
  const { 
    loading: profileLoading, 
    error: profileError, 
    profile, 
    checkProfile, 
    createProfile, 
    clearProfile,
    clearError: clearProfileError 
  } = useYouthProfile();
  
  const { 
    loading: responseLoading,
    saving: responseSaving,
    error: responseError,
    response,
    submitted,
    autoSave,
    retrieveResponse,
    submitResponse,
    checkStatus,
    clearError: clearResponseError,
    reset: resetResponse
  } = useSurveyAutoSave(activeSurvey?.batch_id, profile?.youth_id);

  // Session state
  const [sessionState, setSessionState] = useState({
    initialized: false,
    currentStep: 1,
    formData: {},
    hasExistingResponse: false
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  /**
   * Initialize survey session
   * This is the main entry point for starting a survey
   */
  const initializeSession = useCallback(async (profileCheckData) => {
    if (!hasActiveSurvey) {
      throw new Error('No active survey available');
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Check if youth profile exists
      const profileResult = await checkProfile(profileCheckData);
      
      let youthId, userId;
      
      if (profileResult.exists) {
        youthId = profileResult.youthId;
        userId = profileResult.userId;
      } else {
        // Step 2: Create new youth profile
        const createResult = await createProfile(profileCheckData);
        youthId = createResult.youthId;
        userId = createResult.userId;
      }

      // Step 3: Check for existing survey response (only if we have both IDs)
      let statusResult = null;
      if (activeSurvey?.batch_id && youthId) {
        statusResult = await checkStatus();
        
        if (statusResult?.isSubmitted) {
          setSessionState(prev => ({
            ...prev,
            initialized: true,
            hasExistingResponse: true
          }));
          return {
            success: true,
            message: 'Survey already submitted',
            isSubmitted: true
          };
        }
      }

      // Step 4: Try to retrieve existing response (only if we have both IDs)
      let existingResponse = null;
      if (activeSurvey?.batch_id && youthId) {
        console.log('🔍 Attempting to retrieve existing response...');
        existingResponse = await retrieveResponse();
        console.log('🔍 Retrieved response:', existingResponse);
      } else {
        console.log('❌ Cannot retrieve response: missing batchId or youthId', { 
          batchId: activeSurvey?.batch_id, 
          youthId 
        });
      }
      
      // Initialize form data with terms data if provided
      const initialFormData = existingResponse || {};
      
      // If we have terms data in profileCheckData, include it in form data
      if (profileCheckData?.acceptedSections || profileCheckData?.viewedSections) {
        initialFormData.acceptedSections = profileCheckData.acceptedSections;
        initialFormData.viewedSections = profileCheckData.viewedSections;
      }
      
      setSessionState(prev => ({
        ...prev,
        initialized: true,
        formData: initialFormData,
        hasExistingResponse: !!existingResponse
      }));

      return {
        success: true,
        youthId,
        userId,
        hasExistingResponse: !!existingResponse,
        formData: initialFormData
      };

    } catch (err) {
      setError(err.message || 'Failed to initialize survey session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [hasActiveSurvey, checkProfile, createProfile, checkStatus, retrieveResponse]);

  /**
   * Update form data and auto-save
   */
  const updateFormData = useCallback(async (stepData, stepNumber = null) => {
    const newFormData = {
      ...sessionState.formData,
      ...stepData
    };

    setSessionState(prev => ({
      ...prev,
      formData: newFormData,
      currentStep: stepNumber || prev.currentStep
    }));

    // Auto-save the updated data
    await autoSave(newFormData);
  }, [sessionState.formData, autoSave]);

  /**
   * Navigate to specific step
   */
  const goToStep = useCallback((stepNumber) => {
    setSessionState(prev => ({
      ...prev,
      currentStep: stepNumber
    }));
  }, []);

  /**
   * Submit final survey
   * @param {string} recaptchaToken - The reCAPTCHA token for verification
   */
  const submitSurvey = useCallback(async (recaptchaToken) => {
    if (!sessionState.formData || Object.keys(sessionState.formData).length === 0) {
      throw new Error('No form data to submit');
    }

    if (!recaptchaToken) {
      throw new Error('reCAPTCHA verification is required to submit the survey');
    }

    try {
      await submitResponse(sessionState.formData, recaptchaToken);
      
      setSessionState(prev => ({
        ...prev,
        hasExistingResponse: true
      }));

      return {
        success: true,
        message: 'Survey submitted successfully'
      };
    } catch (err) {
      setError(err.message || 'Failed to submit survey');
      throw err;
    }
  }, [sessionState.formData, submitResponse]);

  /**
   * Clear session data
   */
  const clearSession = useCallback(() => {
    setSessionState({
      initialized: false,
      currentStep: 1,
      formData: {},
      hasExistingResponse: false
    });
    setError(null);
    clearProfile();
    resetResponse();
  }, [clearProfile, resetResponse]);

  /**
   * Clear errors
   */
  const clearErrors = useCallback(() => {
    setError(null);
    clearProfileError();
    clearResponseError();
  }, [clearProfileError, clearResponseError]);

  /**
   * Get current step data
   */
  const getCurrentStepData = useCallback(() => {
    return sessionState.formData;
  }, [sessionState.formData]);

  /**
   * Check if step is completed
   */
  const isStepCompleted = useCallback((stepNumber) => {
    const stepKeys = {
      1: ['terms_accepted'],
      2: ['first_name', 'last_name', 'age', 'gender', 'contact_number', 'email', 'barangay_id'],
      3: ['demographics'],
      4: ['civic_engagement']
    };

    const requiredFields = stepKeys[stepNumber] || [];
    return requiredFields.every(field => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return sessionState.formData[parent] && sessionState.formData[parent][child];
      }
      return sessionState.formData[field] !== undefined && sessionState.formData[field] !== '';
    });
  }, [sessionState.formData]);

  /**
   * Get completion percentage
   */
  const getCompletionPercentage = useCallback(() => {
    const totalSteps = 4;
    let completedSteps = 0;

    for (let i = 1; i <= totalSteps; i++) {
      if (isStepCompleted(i)) {
        completedSteps++;
      }
    }

    return Math.round((completedSteps / totalSteps) * 100);
  }, [isStepCompleted]);

  // Combined loading state
  const isLoading = surveyLoading || profileLoading || responseLoading || loading;
  
  // Combined error state
  const hasError = profileError || responseError || error;

  return {
    // Survey info
    activeSurvey,
    hasActiveSurvey,
    
    // Profile info
    profile,
    
    // Session state
    sessionState,
    currentStep: sessionState.currentStep,
    formData: sessionState.formData,
    hasExistingResponse: sessionState.hasExistingResponse,
    submitted,
    
    // Loading states
    isLoading,
    isSaving: responseSaving,
    
    // Error states
    error: hasError,
    errorMessage: profileError || responseError || error,
    
    // Actions
    initializeSession,
    updateFormData,
    goToStep,
    submitSurvey,
    clearSession,
    clearErrors,
    getCurrentStepData,
    isStepCompleted,
    getCompletionPercentage
  };
};
