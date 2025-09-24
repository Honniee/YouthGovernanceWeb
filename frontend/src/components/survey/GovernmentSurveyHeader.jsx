import React from 'react';
import { Building2, Shield, FileText } from 'lucide-react';

const GovernmentSurveyHeader = ({ surveyTitle, surveyId, department, authorizedBy }) => {
  return (
    <div className="bg-white border-b-2 border-[#24345A] mb-6">
      {/* Official Government Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#24345A] rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{department}</h1>
            <p className="text-sm text-gray-600">Local Youth Development Office</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Survey ID: <span className="font-semibold">{surveyId}</span></div>
          <div className="text-xs text-gray-500">Authorized by: {authorizedBy}</div>
        </div>
      </div>

      {/* Survey Title and Legal Notice */}
      <div className="p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{surveyTitle}</h2>
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <Shield className="w-4 h-4 mt-0.5 text-green-600" />
          <span>
            This survey is conducted under the authority of Republic Act No. 10742 (Sangguniang Kabataan Reform Act of 2015) 
            and Local Ordinance No. [XXX] of San Jose, Batangas.
          </span>
        </div>
      </div>

      {/* Data Privacy Notice */}
      <div className="p-4 bg-blue-50 border-l-4 border-blue-400">
        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 mt-0.5 text-blue-600" />
          <div className="text-sm">
            <p className="font-semibold text-blue-900 mb-1">Data Privacy Notice</p>
            <p className="text-blue-800">
              Your responses are protected under Republic Act No. 10173 (Data Privacy Act of 2012). 
              Data will be used solely for youth development planning and will be stored securely for a maximum of 5 years.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GovernmentSurveyHeader;
