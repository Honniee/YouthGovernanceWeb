/**
 * Email Templates for Youth Governance System
 * Professional email templates for all notification types
 */

export const emailTemplates = {
  // === STAFF MANAGEMENT TEMPLATES ===
  
  staffWelcome: {
    subject: 'Welcome to LYDO Youth Governance System',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to LYDO</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #2563eb, #1e40af); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .header p { margin: 10px 0 0 0; opacity: 0.9; }
          .content { padding: 30px; }
          .welcome-box { background: #f8fafc; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 0 4px 4px 0; }
          .credentials { background: #1f2937; color: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .credentials h3 { margin: 0 0 15px 0; color: #60a5fa; }
          .credential-item { margin: 10px 0; font-family: 'Courier New', monospace; }
          .credential-label { color: #9ca3af; }
          .credential-value { color: #ffffff; font-weight: bold; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          .footer a { color: #2563eb; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏛️ LYDO Youth Governance</h1>
            <p>Local Youth Development Office</p>
          </div>
          <div class="content">
            <h2>Welcome to the Team, ${data.firstName}! 🎉</h2>
            
            <div class="welcome-box">
              <p><strong>Congratulations!</strong> Your staff account has been successfully created in the LYDO Youth Governance System.</p>
            </div>
            
            <p>As a member of the Local Youth Development Office, you now have access to our comprehensive management system for youth programs, SK officials, and community initiatives.</p>
            
            <div class="credentials">
              <h3>🔐 Your Login Credentials</h3>
              <div class="credential-item">
                <span class="credential-label">Staff ID:</span>
                <span class="credential-value">${data.lydoId}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Personal Email:</span>
                <span class="credential-value">${data.personalEmail}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Organization Email:</span>
                <span class="credential-value">${data.orgEmail}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Temporary Password:</span>
                <span class="credential-value">${data.password}</span>
              </div>
            </div>
            
            <p><strong>⚠️ Important Security Notice:</strong></p>
            <ul>
              <li>Please change your password immediately after your first login</li>
              <li>Keep your credentials secure and never share them</li>
              <li>Use your organization email for official communications</li>
            </ul>
            
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">
              🚀 Access System Now
            </a>
            
            <p>If you have any questions or need assistance, please contact your system administrator or IT support.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Local Youth Development Office | Youth Governance System</p>
            <p>This is an automated message. Please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (data) => `
      Welcome to LYDO Youth Governance System!
      
      Dear ${data.firstName} ${data.lastName},
      
      Congratulations! Your staff account has been successfully created.
      
      Login Credentials:
      - Staff ID: ${data.lydoId}
      - Personal Email: ${data.personalEmail}
      - Organization Email: ${data.orgEmail}
      - Temporary Password: ${data.password}
      
      IMPORTANT: Please change your password immediately after your first login.
      
      Login URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login
      
      Best regards,
      LYDO Youth Governance System
    `
  },

  // === SK MANAGEMENT TEMPLATES ===
  
  skOfficialCreated: {
    subject: 'New SK Official Created - Action Required',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #059669, #047857); color: white; padding: 25px; text-align: center; }
          .content { padding: 25px; }
          .info-box { background: #f0fdf4; border-left: 4px solid #059669; padding: 15px; margin: 15px 0; border-radius: 0 4px 4px 0; }
          .details { background: #f8fafc; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .footer { background: #f8fafc; padding: 15px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏛️ SK Official Created</h1>
            <p>New SK Official Registration</p>
          </div>
          <div class="content">
            <div class="info-box">
              <p><strong>A new SK Official has been successfully registered in the system.</strong></p>
            </div>
            
            <div class="details">
              <h3>👤 Official Details</h3>
              <p><strong>Name:</strong> ${data.fullName}</p>
              <p><strong>Position:</strong> ${data.position}</p>
              <p><strong>Barangay:</strong> ${data.barangayName}</p>
              <p><strong>SK ID:</strong> ${data.skId}</p>
              <p><strong>Personal Email:</strong> ${data.personalEmail}</p>
              <p><strong>Organization Email:</strong> ${data.orgEmail}</p>
              <p><strong>Status:</strong> ${data.status}</p>
              <p><strong>Term:</strong> ${data.termName}</p>
              <p><strong>Created:</strong> ${new Date(data.createdAt).toLocaleString()}</p>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Review the SK Official's information for accuracy</li>
              <li>Ensure all required documents are collected</li>
              <li>Coordinate with the barangay for official recognition</li>
            </ul>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} LYDO Youth Governance System</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (data) => `
      New SK Official Created
      
      A new SK Official has been registered:
      
      Name: ${data.fullName}
      Position: ${data.position}
      Barangay: ${data.barangayName}
      SK ID: ${data.skId}
      Email: ${data.personalEmail}
      Organization Email: ${data.orgEmail}
      Status: ${data.status}
      Term: ${data.termName}
      
      Please review and take necessary actions.
      
      LYDO Youth Governance System
    `
  },

  // === TERM MANAGEMENT TEMPLATES ===
  
  termActivated: {
    subject: 'SK Term Activated - System Update',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; padding: 25px; text-align: center; }
          .content { padding: 25px; }
          .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 0 4px 4px 0; }
          .term-info { background: #f8fafc; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .footer { background: #f8fafc; padding: 15px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 SK Term Activated</h1>
            <p>System Term Management Update</p>
          </div>
          <div class="content">
            <div class="alert-box">
              <p><strong>⚠️ Important:</strong> A new SK Term has been activated in the system.</p>
            </div>
            
            <div class="term-info">
              <h3>📋 Term Information</h3>
              <p><strong>Term Name:</strong> ${data.termName}</p>
              <p><strong>Term ID:</strong> ${data.termId}</p>
              <p><strong>Start Date:</strong> ${new Date(data.startDate).toLocaleDateString()}</p>
              <p><strong>End Date:</strong> ${new Date(data.endDate).toLocaleDateString()}</p>
              <p><strong>Status:</strong> Active</p>
              <p><strong>Activated:</strong> ${new Date(data.activatedAt).toLocaleString()}</p>
              <p><strong>Activated By:</strong> ${data.activatedBy}</p>
            </div>
            
            <p><strong>System Changes:</strong></p>
            <ul>
              <li>This term is now the active term for all SK operations</li>
              <li>New SK Officials will be assigned to this term</li>
              <li>Previous term has been automatically deactivated</li>
              <li>All SK management functions now reference this term</li>
            </ul>
            
            <p><strong>Action Required:</strong> Please ensure all stakeholders are informed of this term change.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} LYDO Youth Governance System</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (data) => `
      SK Term Activated
      
      A new SK Term has been activated:
      
      Term: ${data.termName} (${data.termId})
      Period: ${new Date(data.startDate).toLocaleDateString()} - ${new Date(data.endDate).toLocaleDateString()}
      Activated: ${new Date(data.activatedAt).toLocaleString()}
      Activated By: ${data.activatedBy}
      
      This is now the active term for all SK operations.
      
      LYDO Youth Governance System
    `
  },

  // === CRITICAL ALERTS ===
  
  criticalSystemAlert: {
    subject: '🚨 CRITICAL: System Alert - Immediate Action Required',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #fef2f2; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border: 2px solid #dc2626; }
          .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 25px; text-align: center; }
          .content { padding: 25px; }
          .critical-box { background: #fee2e2; border: 2px solid #dc2626; padding: 15px; margin: 15px 0; border-radius: 6px; }
          .error-details { background: #1f2937; color: white; padding: 15px; border-radius: 6px; margin: 15px 0; font-family: 'Courier New', monospace; }
          .footer { background: #fef2f2; padding: 15px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 CRITICAL SYSTEM ALERT</h1>
            <p>Immediate Attention Required</p>
          </div>
          <div class="content">
            <div class="critical-box">
              <h3>⚠️ Critical Issue Detected</h3>
              <p><strong>Alert Type:</strong> ${data.alertType}</p>
              <p><strong>Severity:</strong> ${data.severity}</p>
              <p><strong>Time:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
            </div>
            
            <h3>📋 Issue Details</h3>
            <p><strong>Description:</strong> ${data.description}</p>
            
            ${data.errorMessage ? `
            <div class="error-details">
              <h4>Error Message:</h4>
              <pre>${data.errorMessage}</pre>
            </div>
            ` : ''}
            
            <h3>🔧 Recommended Actions</h3>
            <ul>
              <li>Investigate the issue immediately</li>
              <li>Check system logs for additional details</li>
              <li>Contact technical support if needed</li>
              <li>Monitor system stability</li>
            </ul>
            
            <p><strong>⏰ Response Required:</strong> Please acknowledge this alert and take appropriate action within 15 minutes.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} LYDO Youth Governance System - Critical Alert</p>
            <p>This is an automated critical alert. Immediate action required.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (data) => `
      🚨 CRITICAL SYSTEM ALERT 🚨
      
      Alert Type: ${data.alertType}
      Severity: ${data.severity}
      Time: ${new Date(data.timestamp).toLocaleString()}
      
      Description: ${data.description}
      
      ${data.errorMessage ? `Error: ${data.errorMessage}` : ''}
      
      IMMEDIATE ACTION REQUIRED
      
      Please investigate and respond within 15 minutes.
      
      LYDO Youth Governance System
    `
  },

  // === BULK OPERATION TEMPLATES ===
  
  bulkOperationComplete: {
    subject: 'Bulk Operation Completed - Results Summary',
    html: (data) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #0891b2, #0e7490); color: white; padding: 25px; text-align: center; }
          .content { padding: 25px; }
          .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
          .stat-card { background: #f8fafc; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #0891b2; }
          .stat-number { font-size: 24px; font-weight: bold; color: #0891b2; }
          .stat-label { color: #6b7280; font-size: 14px; }
          .footer { background: #f8fafc; padding: 15px; text-align: center; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Bulk Operation Complete</h1>
            <p>Operation Results Summary</p>
          </div>
          <div class="content">
            <h3>Operation: ${data.operationType}</h3>
            
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-number">${data.totalRecords}</div>
                <div class="stat-label">Total Records</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${data.successCount}</div>
                <div class="stat-label">Successful</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${data.errorCount}</div>
                <div class="stat-label">Errors</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${Math.round((data.successCount / data.totalRecords) * 100)}%</div>
                <div class="stat-label">Success Rate</div>
              </div>
            </div>
            
            ${data.fileName ? `<p><strong>File:</strong> ${data.fileName}</p>` : ''}
            <p><strong>Started:</strong> ${new Date(data.startTime).toLocaleString()}</p>
            <p><strong>Completed:</strong> ${new Date(data.endTime).toLocaleString()}</p>
            <p><strong>Duration:</strong> ${Math.round((new Date(data.endTime) - new Date(data.startTime)) / 1000)} seconds</p>
            
            ${data.errors && data.errors.length > 0 ? `
            <h4>⚠️ Errors Encountered:</h4>
            <ul>
              ${data.errors.slice(0, 5).map(error => `<li>${error}</li>`).join('')}
              ${data.errors.length > 5 ? `<li>... and ${data.errors.length - 5} more errors</li>` : ''}
            </ul>
            ` : ''}
            
            <p>The bulk operation has been completed. Please review the results and take any necessary follow-up actions.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} LYDO Youth Governance System</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (data) => `
      Bulk Operation Complete
      
      Operation: ${data.operationType}
      
      Results:
      - Total Records: ${data.totalRecords}
      - Successful: ${data.successCount}
      - Errors: ${data.errorCount}
      - Success Rate: ${Math.round((data.successCount / data.totalRecords) * 100)}%
      
      ${data.fileName ? `File: ${data.fileName}` : ''}
      Started: ${new Date(data.startTime).toLocaleString()}
      Completed: ${new Date(data.endTime).toLocaleString()}
      
      ${data.errors && data.errors.length > 0 ? `
      Errors:
      ${data.errors.slice(0, 10).map(error => `- ${error}`).join('\n')}
      ` : ''}
      
      LYDO Youth Governance System
    `
  }
};

// === TEMPLATE HELPER FUNCTIONS ===

export const getTemplate = (templateName) => {
  return emailTemplates[templateName] || null;
};

export const renderTemplate = (templateName, data) => {
  const template = getTemplate(templateName);
  if (!template) {
    throw new Error(`Email template '${templateName}' not found`);
  }
  
  return {
    subject: template.subject,
    html: template.html(data),
    text: template.text(data)
  };
};

export const validateTemplateData = (templateName, data) => {
  const requiredFields = {
    staffWelcome: ['firstName', 'lastName', 'lydoId', 'personalEmail', 'orgEmail', 'password'],
    skOfficialCreated: ['fullName', 'position', 'barangayName', 'skId', 'personalEmail', 'orgEmail', 'status', 'termName', 'createdAt'],
    termActivated: ['termName', 'termId', 'startDate', 'endDate', 'activatedAt', 'activatedBy'],
    criticalSystemAlert: ['alertType', 'severity', 'timestamp', 'description'],
    bulkOperationComplete: ['operationType', 'totalRecords', 'successCount', 'errorCount', 'startTime', 'endTime']
  };
  
  const required = requiredFields[templateName];
  if (!required) {
    return { isValid: true };
  }
  
  const missing = required.filter(field => !data.hasOwnProperty(field));
  
  return {
    isValid: missing.length === 0,
    missingFields: missing
  };
};

export default emailTemplates;