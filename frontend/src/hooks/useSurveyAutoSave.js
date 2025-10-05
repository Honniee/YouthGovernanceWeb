import { useState, useCallback, useRef, useEffect } from 'react';
import { saveSurveyResponse, getSurveyResponse, submitSurveyResponse, checkSubmissionStatus } from '../services/surveyResponsesService';

/**
 * Custom hook for survey auto-save functionality
 * Handles saving, retrieving, and submitting survey responses
 */
export const useSurveyAutoSave = (batchId, youthId) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  
  // Auto-save timer reference
  const autoSaveTimerRef = useRef(null);
  const lastSavedDataRef = useRef(null);

  /**
   * Auto-save survey response with debouncing
   */
  const autoSave = useCallback(async (responseData, immediate = false) => {
    if (!batchId || !youthId || !responseData) {
      return;
    }

    // Debounce auto-save (wait 2 seconds after last change)
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    const saveData = async () => {
      // Only save if data has actually changed
      const dataString = JSON.stringify(responseData);
      if (lastSavedDataRef.current === dataString) {
        return;
      }

      setSaving(true);
      setError(null);

      try {
        const result = await saveSurveyResponse({
          batch_id: batchId,
          youth_id: youthId,
          response_data: responseData,
          status: 'in_progress'
        });

        if (result.success) {
          setResponse(result.response);
          lastSavedDataRef.current = dataString;
          console.log('Survey auto-saved successfully');
        }
      } catch (err) {
        setError(err.message || 'Failed to auto-save survey');
        console.error('Auto-save failed:', err);
      } finally {
        setSaving(false);
      }
    };

    if (immediate) {
      await saveData();
    } else {
      autoSaveTimerRef.current = setTimeout(saveData, 2000);
    }
  }, [batchId, youthId]);

  /**
   * Retrieve existing survey response
   */
  const retrieveResponse = useCallback(async () => {
    if (!batchId || !youthId) {
      console.log('❌ Cannot retrieve response: missing batchId or youthId', { batchId, youthId });
      return null;
    }

    console.log('🔍 Retrieving response for:', { batchId, youthId });
    setLoading(true);
    setError(null);

    try {
      const result = await getSurveyResponse(batchId, youthId);
      console.log('🔍 API response:', result);
      
      if (result.success && result.exists) {
        console.log('✅ Found existing response:', result.response_data);
        setResponse(result);
        lastSavedDataRef.current = JSON.stringify(result.response_data);
        
        // Check if already submitted
        if (result.status === 'submitted') {
          setSubmitted(true);
        }
        
        return result.response_data;
      } else {
        console.log('❌ No existing response found');
        setResponse(null);
        return null;
      }
    } catch (err) {
      console.error('❌ Error retrieving response:', err);
      setError(err.message || 'Failed to retrieve survey response');
      return null;
    } finally {
      setLoading(false);
    }
  }, [batchId, youthId]);

  /**
   * Submit final survey response
   * @param {object} responseData - The survey response data
   * @param {string} recaptchaToken - The reCAPTCHA token for verification
   */
  const submitResponse = useCallback(async (responseData, recaptchaToken) => {
    if (!response?.response_id) {
      throw new Error('No survey response found to submit');
    }

    if (!recaptchaToken) {
      throw new Error('reCAPTCHA verification is required to submit the survey');
    }

    setLoading(true);
    setError(null);

    try {
      const result = await submitSurveyResponse(response.response_id, responseData, recaptchaToken);
      
      if (result.success) {
        setResponse(result.response);
        setSubmitted(true);
        lastSavedDataRef.current = JSON.stringify(responseData);
        return result.response;
      } else {
        throw new Error(result.message || 'Failed to submit survey response');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit survey response');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [response]);

  /**
   * Check submission status
   */
  const checkStatus = useCallback(async () => {
    if (!batchId || !youthId) {
      return null;
    }

    try {
      const result = await checkSubmissionStatus(batchId, youthId);
      
      if (result.success) {
        if (result.has_response) {
          setSubmitted(result.is_submitted);
          return {
            hasResponse: true,
            isSubmitted: result.is_submitted,
            status: result.status,
            submittedAt: result.submitted_at
          };
        } else {
          setSubmitted(false);
          return {
            hasResponse: false,
            isSubmitted: false,
            status: null,
            submittedAt: null
          };
        }
      }
    } catch (err) {
      console.error('Failed to check submission status:', err);
      return null;
    }
  }, [batchId, youthId]);

  /**
   * Clear auto-save timer on unmount
   */
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset hook state
   */
  const reset = useCallback(() => {
    setResponse(null);
    setSubmitted(false);
    setError(null);
    lastSavedDataRef.current = null;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
  }, []);

  return {
    loading,
    saving,
    error,
    response,
    submitted,
    autoSave,
    retrieveResponse,
    submitResponse,
    checkStatus,
    clearError,
    reset
  };
};
