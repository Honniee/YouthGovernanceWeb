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
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to LYDO Portal</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .announcement-banner { background-color: #d946ef; color: white; padding: 10px; text-align: center; font-size: 13px; display: ${data.announcementBanner ? 'block' : 'none'}; }
          .header { background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; padding: 30px 20px; text-align: center; }
          .logo-container { width: 80px; height: 80px; background-color: white; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
          .logo-container img { width: 100%; height: 100%; object-fit: contain; padding: 10px; }
          .logo-text { font-weight: bold; font-size: 24px; color: #2c3e50; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
          .header p { margin: 5px 0 0; font-size: 14px; opacity: 0.9; }
          .content { padding: 40px 30px; color: #333; }
          .content h2 { color: #2c3e50; font-size: 20px; margin: 0 0 20px; text-align: center; }
          .content p { line-height: 1.6; margin: 0 0 15px; font-size: 15px; }
          .credentials-box { background-color: #f8f9fa; border-left: 4px solid #2c3e50; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .credentials-box p { margin: 10px 0; font-size: 14px; }
          .credentials-box strong { color: #2c3e50; display: inline-block; width: 140px; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; font-size: 14px; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 13px; color: #6c757d; }
          .footer p { margin: 5px 0; }
          .divider { height: 1px; background-color: #e0e0e0; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="email-container">
          ${data.announcementBanner ? `<div class="announcement-banner">${data.announcementBanner}</div>` : ''}
          <div class="header">
            <div class="logo-container">
              ${data.logoUrl ? `<img src="${data.logoUrl}" alt="Municipality Logo" />` : '<div class="logo-text">LYDO</div>'}
            </div>
            <h1>Local Youth Development Office</h1>
            <p>Municipality of San Jose, Batangas</p>
          </div>
          <div class="content">
            <h2>Welcome to LYDO Portal!</h2>
            <p>Dear <strong>${data.firstName} ${data.lastName}</strong>,</p>
            <p>Your account has been successfully created. Below are your login credentials to access the Local Youth Development Office portal.</p>
            
            <div class="credentials-box">
              <p><strong>Username:</strong> ${data.lydoId}</p>
              <p><strong>Password:</strong> ${data.password}</p>
              <p><strong>Account Type:</strong> ${data.roleName || data.role || 'Staff'}</p>
              <p><strong>Portal URL:</strong> ${data.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000'}</p>
            </div>
            
            <p><strong style="color: #dc3545;">Important:</strong> For security reasons, please change your password upon first login.</p>
            
            <a href="${data.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">Access Portal</a>
            
            <div class="divider"></div>
            
            <p style="font-size: 13px; color: #6c757d;">If you did not request this account, please contact us immediately at ${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'}.</p>
          </div>
          <div class="footer">
            <p><strong>Local Youth Development Office</strong></p>
            <p>Municipality of San Jose, Batangas</p>
            <p>Email: ${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'} | Phone: ${data.contactPhone || '(043) 123-4567'}</p>
            <p style="margin-top: 15px; font-size: 12px;">© ${new Date().getFullYear()} LYDO. All rights reserved.</p>
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
  
  skOfficialWelcome: {
    subject: 'Welcome to SK Governance - Your Account Credentials',
    html: (data) => `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to SK Governance Portal</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .announcement-banner { background-color: #d946ef; color: white; padding: 10px; text-align: center; font-size: 13px; display: ${data.announcementBanner ? 'block' : 'none'}; }
          .header { background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; padding: 30px 20px; text-align: center; }
          .logo-container { width: 80px; height: 80px; background-color: white; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
          .logo-container img { width: 100%; height: 100%; object-fit: contain; padding: 10px; }
          .logo-text { font-weight: bold; font-size: 24px; color: #2c3e50; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
          .header p { margin: 5px 0 0; font-size: 14px; opacity: 0.9; }
          .content { padding: 40px 30px; color: #333; }
          .content h2 { color: #2c3e50; font-size: 20px; margin: 0 0 20px; text-align: center; }
          .content p { line-height: 1.6; margin: 0 0 15px; font-size: 15px; }
          .credentials-box { background-color: #f8f9fa; border-left: 4px solid #2c3e50; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .credentials-box p { margin: 10px 0; font-size: 14px; }
          .credentials-box strong { color: #2c3e50; display: inline-block; width: 140px; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; font-size: 14px; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 13px; color: #6c757d; }
          .footer p { margin: 5px 0; }
          .divider { height: 1px; background-color: #e0e0e0; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="email-container">
          ${data.announcementBanner ? `<div class="announcement-banner">${data.announcementBanner}</div>` : ''}
          <div class="header">
            <div class="logo-container">
              ${data.logoUrl ? `<img src="${data.logoUrl}" alt="Municipality Logo" />` : '<div class="logo-text">LYDO</div>'}
            </div>
            <h1>Local Youth Development Office</h1>
            <p>Municipality of San Jose, Batangas</p>
          </div>
          <div class="content">
            <h2>Welcome to SK Governance Portal!</h2>
            <p>Dear <strong>${data.firstName} ${data.lastName}</strong>,</p>
            <p>Congratulations! You have been successfully appointed as <strong>${data.position}</strong> for Barangay <strong>${data.barangayName}</strong>.</p>
            <p>Your SK Official account has been created. Below are your login credentials to access the SK Governance system.</p>
            
            <div class="credentials-box">
              <p><strong>SK ID:</strong> ${data.skId}</p>
              <p><strong>Position:</strong> ${data.position}</p>
              <p><strong>Barangay:</strong> ${data.barangayName}</p>
              <p><strong>Username:</strong> ${data.orgEmail || data.skId}</p>
              <p><strong>Password:</strong> ${data.password}</p>
              <p><strong>Portal URL:</strong> ${data.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000'}</p>
            </div>
            
            <p><strong style="color: #dc3545;">Important:</strong> For security reasons, please change your password upon first login.</p>
            
            <a href="${data.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">Access SK Portal</a>
            
            <div class="divider"></div>
            
            <p><strong>As an SK Official, you will have access to:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Youth survey validation and management</li>
              <li>Community project tracking</li>
              <li>SK meeting and event coordination</li>
              <li>Youth engagement programs</li>
            </ul>
            
            <p style="font-size: 13px; color: #6c757d;">If you did not request this account, please contact us immediately at ${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'}.</p>
          </div>
          <div class="footer">
            <p><strong>Local Youth Development Office</strong></p>
            <p>Municipality of San Jose, Batangas</p>
            <p>Email: ${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'} | Phone: ${data.contactPhone || '(043) 123-4567'}</p>
            <p style="margin-top: 15px; font-size: 12px;">© ${new Date().getFullYear()} LYDO. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (data) => `
      Welcome to SK Governance - Sangguniang Kabataan Management System
      
      Congratulations ${data.firstName} ${data.lastName}!
      
      You have been successfully appointed as ${data.position} for Barangay ${data.barangayName}.
      
      Your SK Official account has been created in the LYDO Youth Governance System.
      
      Your SK Official Credentials:
      - SK ID: ${data.skId}
      - Position: ${data.position}
      - Barangay: ${data.barangayName}
      - Organization Email: ${data.orgEmail || data.skId}
      - Temporary Password: ${data.password}
      
      IMPORTANT SECURITY NOTICE:
      - Please change your password immediately after your first login
      - Keep your credentials secure and never share them
      - Use your organization email for official SK communications
      
      You can now access the SK Governance system at: ${data.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000'}/login
      
      As an SK Official, you will have access to:
      - Youth survey validation and management
      - Community project tracking
      - SK meeting and event coordination
      - Youth engagement programs
      
      If you have any questions or need assistance, please contact the LYDO administration.
      
      This is an automated message from the LYDO Youth Governance System.
      Please do not reply to this email.
    `
  },
  
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
  },

  // === SURVEY VALIDATION TEMPLATES ===
  
  surveyValidated: {
    subject: 'Your Survey Has Been Validated - LYDO Youth Governance',
    html: (data) => `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Survey Approved - LYDO</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header-top { background-color: #24345A; color: white; padding: 8px 20px; font-size: 12px; }
          .header-top-container { max-width: 1200px; margin: 0 auto; display: flex; justify-content: flex-end; align-items: center; }
          .header-top-right { display: flex; align-items: center; gap: 8px; }
          .header-top-link { color: rgba(255, 255, 255, 0.85); text-decoration: none; display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px; border-radius: 9999px; background-color: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.15); transition: all 0.2s; }
          .header-top-link:hover { color: white; background-color: rgba(255, 255, 255, 0.1); }
          .header-white { background-color: #ffffff; padding: 12px 20px; border-bottom: 1px solid #e5e7eb; }
          .header-white-container { max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 12px; }
          .logo-container { width: 36px; height: 36px; background-color: white; border: 1px solid #e5e7eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
          .logo-container img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }
          .logo-text { font-weight: bold; font-size: 14px; color: #2c3e50; }
          .header-info { text-align: left; }
          .header-info h1 { margin: 0; font-size: 14px; font-weight: 400; color: #4b5563; line-height: 1.4; }
          .header-info p { margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4; }
          .content { padding: 40px 30px; color: #333; }
          .content h2 { color: #2c3e50; font-size: 20px; margin: 0 0 20px; text-align: center; }
          .content p { line-height: 1.6; margin: 0 0 15px; font-size: 15px; }
          .info-section { background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .info-section p { margin: 8px 0; font-size: 14px; }
          .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; margin: 10px 0; }
          .status-approved { background-color: #d4edda; color: #155724; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; font-size: 14px; }
          .privacy-section { background-color: #f8f9fa; border-left: 4px solid #2c3e50; padding: 20px; margin: 30px 0; border-radius: 4px; }
          .privacy-section h3 { color: #2c3e50; font-size: 16px; margin: 0 0 10px; font-weight: 600; }
          .privacy-section ul { margin: 10px 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #555; }
          .privacy-section li { margin: 8px 0; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 13px; color: #6c757d; }
          .footer p { margin: 5px 0; }
          .privacy-notice-box { background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 30px 0; }
          .privacy-notice-box h4 { color: #92400e; font-size: 16px; font-weight: 600; margin: 0 0 12px; }
          .privacy-notice-box p { margin: 8px 0; line-height: 1.6; color: #78350f; font-size: 13px; }
          .privacy-notice-box a { color: #92400e; text-decoration: underline; font-weight: 500; }
          .footer-privacy { border-top: 1px solid #e0e0e0; margin-top: 20px; padding-top: 20px; text-align: left; }
          .footer-privacy p { margin: 8px 0; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header-top">
            <div class="header-top-container">
              <div class="header-top-right" style="margin-left: auto;">
                <a href="mailto:${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'}" class="header-top-link" style="color: rgba(255, 255, 255, 0.85); text-decoration: none; display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px; border-radius: 9999px; background-color: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.15);">
                  <span style="font-size: 12px;">✉</span>
                  <span style="font-size: 12px; letter-spacing: 0.025em;">${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'}</span>
                </a>
              </div>
            </div>
          </div>
          <div class="header-white">
            <div class="header-white-container">
              <div class="logo-container">
                ${data.logoUrl ? `<img src="${data.logoUrl}" alt="Municipality Logo" />` : '<div class="logo-text" style="font-size: 12px;">LYDO</div>'}
              </div>
              <div class="header-info">
                <h1>Municipality of San Jose, Batangas</h1>
                <p>Local Youth Development Office</p>
              </div>
            </div>
          </div>
          <div class="content">
            <h2>Survey Approved</h2>
            <p>Dear <strong>${data.userName || 'Valued Youth'}</strong>,</p>
            <p>Great news! Your KK Survey submission has been approved.</p>
            
            <!-- Receipt Card -->
            <div class="card-container" style="max-width: 500px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08); overflow: hidden; border: 1px solid #e5e7eb;">
              <div class="header-green" style="background-color: #e8f5e9; padding: 25px 30px; text-align: center; border-bottom: 1px solid #c8e6c9;">
                <span class="icon" style="display: inline-block; vertical-align: middle; margin-right: 10px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" style="width: 28px; height: 28px; color: #2e7d32; fill: #2e7d32;"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M9 11l2 2l4 -4" /></svg></span>
                <h2 style="font-size: 22px; color: #2e7d32; margin: 0; font-weight: 600; display: inline-block; vertical-align: middle;">Submission Confirmed</h2>
                <p style="font-size: 14px; color: #1b5e20; margin: 5px 0 0;">${data.batchName || 'KK Survey'}</p>
              </div>
              <div class="details-section" style="padding: 30px;">
                <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                  <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Name:</span>
                  <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word;">${data.userName || '-'}</span>
                </div>
                ${data.email ? `
                <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                  <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Email:</span>
                  <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word;">${data.email}</span>
                </div>
                ` : ''}
                ${data.youthId ? `
                <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                  <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Youth ID:</span>
                  <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word; font-family: monospace;">${data.youthId}</span>
                </div>
                ` : ''}
                <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                  <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Survey Batch name:</span>
                  <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word;">${data.batchName || 'Youth Survey'}</span>
                </div>
                <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                  <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Response ID:</span>
                  <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word; font-family: monospace;">${data.responseId || 'N/A'}</span>
                </div>
                <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                  <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Submitted:</span>
                  <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word;">${(() => {
                    const submittedDate = data.submittedAt || data.submissionDate || new Date();
                    const date = new Date(submittedDate);
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const year = date.getFullYear();
                    const hours = date.getHours();
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    const displayHours = hours % 12 || 12;
                    return `${month}/${day}/${year} at ${displayHours}:${minutes} ${ampm}`;
                  })()}</span>
                </div>
              </div>
              <div class="footer-green" style="background-color: #f1f8f4; padding: 20px 30px; text-align: center; border-top: 1px solid #c8e6c9;">
                <span class="icon" style="display: inline-block; vertical-align: middle; margin-right: 8px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px; color: #2e7d32; fill: #2e7d32;"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10" /></svg></span>
                <p style="font-size: 13px; color: #2e7d32; margin: 0; display: inline-block; vertical-align: middle; font-weight: 500;">Profile validated</p>
              </div>
            </div>
            
            <p>Thank you for your participation in the ${data.batchName || 'Youth Survey'}. Your contribution helps us better serve the youth of San Jose, Batangas.</p>
            
            ${data.trackingUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <p style="margin-bottom: 15px;"><strong>View Your Submission:</strong></p>
              <a href="${data.trackingUrl}" class="button" style="background: linear-gradient(135deg, #24345A 0%, #1e2a47 100%);">View Submission Details</a>
              <p style="margin-top: 10px; font-size: 12px; color: #666;">Or copy this link: ${data.trackingUrl}</p>
              <p style="margin-top: 5px; font-size: 11px; color: #999;">This link will expire in 72 hours.</p>
            </div>
            ` : ''}
            
            ${data.youthId && data.email ? `
            <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e5e7eb;">
              <p style="margin-bottom: 10px; font-size: 14px; color: #555;"><strong>Need a new link?</strong></p>
              <p style="margin-bottom: 15px; font-size: 13px; color: #666;">If your link expires or you need to resend this email, you can request a new one.</p>
              <a href="${data.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000'}/survey-submission/status?resend=true" class="button" style="background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%); display: inline-block; padding: 10px 20px; font-size: 14px;">Resend Email</a>
              <p style="margin-top: 10px; font-size: 11px; color: #999;">You'll need your Youth ID: <strong style="font-family: monospace;">${data.youthId}</strong></p>
            </div>
            ` : ''}
            
            <p><strong>Your information has been validated and is now securely stored in our system.</strong></p>
            
            <a href="mailto:${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'}?subject=Survey Status Inquiry - ${data.batchName || 'Youth Survey'}" class="button">Contact Support</a>
            
            <div class="privacy-section">
              <h3>🔒 Your Privacy & Data Protection</h3>
              <ul>
                <li><strong>Email Usage:</strong> Your email address is used solely to send you updates about your survey submission. We will never share, sell, or use your email for marketing purposes.</li>
                <li><strong>Data Security:</strong> All your personal information is stored securely and accessed only by authorized LYDO personnel for validation purposes.</li>
                <li><strong>Confidentiality:</strong> Your survey responses are kept confidential and used only for youth governance research and program development.</li>
                <li><strong>Your Rights:</strong> You have the right to inquire about your data, request updates, or contact us with privacy concerns at any time.</li>
                <li><strong>No Account Required:</strong> You don't need an account to participate. Your email is only used to notify you about your survey status.</li>
              </ul>
              <p style="margin-top: 15px; font-size: 14px;"><strong>Your email will only be used for important updates related to your survey participation.</strong></p>
              <div style="text-align: center; margin: 20px 0; padding: 15px; background-color: #e8f5e9; border-radius: 5px;">
                <p style="margin-bottom: 10px; font-weight: 600; color: #2e7d32;">📋 Your Data Subject Rights (RA 10173)</p>
                <p style="margin-bottom: 15px; font-size: 14px; color: #555;">Under the Data Privacy Act of 2012, you have the right to access, correct, delete, or object to the processing of your personal data.</p>
                <a href="${data.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000'}/data-subject-rights" class="button" style="background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%); margin: 0;">Request Access, Correction, or Deletion of Your Data</a>
                <p style="margin-top: 10px; font-size: 12px; color: #666;">You can submit a request anytime, and we will respond within 30 days as required by law.</p>
              </div>
            </div>
            
            <div class="privacy-notice-box">
              <h4>⚠️ Important Privacy Notice</h4>
              <p><strong>This email was sent to you because you submitted a survey using this email address.</strong> If you did not submit a survey, please ignore this email or contact us at <a href="mailto:${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'}">${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'}</a> to report this.</p>
              <p><strong>Your email address is kept confidential and is never shared with third parties.</strong></p>
              <p><strong>Questions about your data?</strong> Contact us at ${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'} or ${data.contactPhone || '(043) 123-4567'}</p>
            </div>
          </div>
          <div class="footer">
            <p><strong>Local Youth Development Office</strong></p>
            <p>Municipality of San Jose, Batangas</p>
            <p>Email: ${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'} | Phone: ${data.contactPhone || '(043) 123-4567'}</p>
            <p style="margin-top: 15px; font-size: 12px;">© ${new Date().getFullYear()} LYDO. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (data) => `
      Survey Validated - LYDO Youth Governance
      
      Congratulations!
      
      Your survey submission has been successfully validated!
      
      Survey Details:
      - Survey Batch: ${data.batchName || 'Youth Survey'}
      - Validation Date: ${new Date(data.validationDate || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      ${data.validationTier ? `- Validation Type: ${data.validationTier === 'automatic' ? 'Automatic' : 'Manual Review'}` : ''}
      
      Your participation in our youth governance programs is valuable and helps us better serve the community. Thank you for taking the time to complete the survey.
      
      Your information has been validated and is now securely stored in our system.
      
      YOUR PRIVACY & DATA PROTECTION:
      
      • Email Usage: Your email address is used solely to send you updates about your survey submission. We will never share, sell, or use your email for marketing purposes.
      
      • Data Security: All your personal information is stored securely and accessed only by authorized LYDO personnel for validation purposes.
      
      • Confidentiality: Your survey responses are kept confidential and used only for youth governance research and program development.
      
      • Your Rights: You have the right to inquire about your data, request updates, or contact us with privacy concerns at any time.
      
      • No Account Required: You don't need an account to participate. Your email is only used to notify you about your survey status.
      
      Your email will only be used for important updates related to your survey participation.
      
      If you have any questions or concerns, please contact the Local Youth Development Office.
      
      PRIVACY NOTICE:
      This email was sent to you because you submitted a survey using this email address. If you did not submit a survey, please ignore this email or contact us at ${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'} to report this. Your email address is kept confidential and is never shared with third parties.
      
      Questions about your data? Contact us at ${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'} or ${data.contactPhone || '(043) 123-4567'}
      
      © ${new Date().getFullYear()} Local Youth Development Office | Youth Governance System
    `
  },

  surveyRejected: {
    subject: 'Survey Status Update - LYDO Youth Governance',
    html: (data) => `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Survey Requires Revision - LYDO</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; padding: 30px 20px; text-align: center; }
          .logo-container { width: 80px; height: 80px; background-color: white; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
          .logo-container img { width: 100%; height: 100%; object-fit: contain; padding: 10px; }
          .logo-text { font-weight: bold; font-size: 24px; color: #2c3e50; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
          .header p { margin: 5px 0 0; font-size: 14px; opacity: 0.9; }
          .content { padding: 40px 30px; color: #333; }
          .content h2 { color: #2c3e50; font-size: 20px; margin: 0 0 20px; text-align: center; }
          .content p { line-height: 1.6; margin: 0 0 15px; font-size: 15px; }
          .info-section { background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .info-section p { margin: 8px 0; font-size: 14px; }
          .credentials-box { background-color: #f8f9fa; border-left: 4px solid #dc3545; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .credentials-box p { margin: 10px 0; font-size: 14px; }
          .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; margin: 10px 0; }
          .status-rejected { background-color: #f8d7da; color: #721c24; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; font-size: 14px; }
          .privacy-section { background-color: #f8f9fa; border-left: 4px solid #2c3e50; padding: 20px; margin: 30px 0; border-radius: 4px; }
          .privacy-section h3 { color: #2c3e50; font-size: 16px; margin: 0 0 10px; font-weight: 600; }
          .privacy-section ul { margin: 10px 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #555; }
          .privacy-section li { margin: 8px 0; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 13px; color: #6c757d; }
          .footer p { margin: 5px 0; }
          .privacy-notice-box { background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 30px 0; }
          .privacy-notice-box h4 { color: #92400e; font-size: 16px; font-weight: 600; margin: 0 0 12px; }
          .privacy-notice-box p { margin: 8px 0; line-height: 1.6; color: #78350f; font-size: 13px; }
          .privacy-notice-box a { color: #92400e; text-decoration: underline; font-weight: 500; }
          .footer-privacy { border-top: 1px solid #e0e0e0; margin-top: 20px; padding-top: 20px; text-align: left; }
          .footer-privacy p { margin: 8px 0; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header-top">
            <div class="header-top-container">
              <div class="header-top-right" style="margin-left: auto;">
                <a href="mailto:${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'}" class="header-top-link" style="color: rgba(255, 255, 255, 0.85); text-decoration: none; display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px; border-radius: 9999px; background-color: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.15);">
                  <span style="font-size: 12px;">✉</span>
                  <span style="font-size: 12px; letter-spacing: 0.025em;">${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'}</span>
                </a>
              </div>
            </div>
          </div>
          <div class="header-white">
            <div class="header-white-container">
              <div class="logo-container">
                ${data.logoUrl ? `<img src="${data.logoUrl}" alt="Municipality Logo" />` : '<div class="logo-text" style="font-size: 12px;">LYDO</div>'}
              </div>
              <div class="header-info">
                <h1>Municipality of San Jose, Batangas</h1>
                <p>Local Youth Development Office</p>
              </div>
            </div>
          </div>
          <div class="content">
            <h2>Survey Submission Requires Revision</h2>
            <p>Dear <strong>${data.userName || 'Valued Youth'}</strong>,</p>
            <p>We have reviewed your KK Survey submission. Unfortunately, it requires some revisions before it can be approved.</p>
            
            <!-- Receipt Card -->
            <div class="card-container" style="max-width: 500px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08); overflow: hidden; border: 1px solid #e5e7eb;">
              <div class="header-green" style="background-color: #fff3cd; padding: 25px 30px; text-align: center; border-bottom: 1px solid #ffeaa7;">
                <span class="icon" style="display: inline-block; vertical-align: middle; margin-right: 10px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" style="width: 28px; height: 28px; color: #856404; fill: #856404;"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M9 11l2 2l4 -4" /></svg></span>
                <h2 style="font-size: 22px; color: #856404; margin: 0; font-weight: 600; display: inline-block; vertical-align: middle;">Submission Requires Revision</h2>
                <p style="font-size: 14px; color: #6c5200; margin: 5px 0 0;">${data.batchName || 'KK Survey'}</p>
              </div>
              <div class="details-section" style="padding: 30px;">
                <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                  <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Name:</span>
                  <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word;">${data.userName || '-'}</span>
                </div>
                ${data.email ? `
                <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                  <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Email:</span>
                  <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word;">${data.email}</span>
                </div>
                ` : ''}
                ${data.youthId ? `
                <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                  <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Youth ID:</span>
                  <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word; font-family: monospace;">${data.youthId}</span>
                </div>
                ` : ''}
                <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                  <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Survey Batch name:</span>
                  <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word;">${data.batchName || 'Youth Survey'}</span>
                </div>
                <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                  <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Response ID:</span>
                  <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word; font-family: monospace;">${data.responseId || 'N/A'}</span>
                </div>
                <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                  <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Submitted:</span>
                  <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word;">${(() => {
                    const submittedDate = data.submittedAt || data.submissionDate || new Date();
                    const date = new Date(submittedDate);
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const year = date.getFullYear();
                    const hours = date.getHours();
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    const displayHours = hours % 12 || 12;
                    return `${month}/${day}/${year} at ${displayHours}:${minutes} ${ampm}`;
                  })()}</span>
                </div>
              </div>
              <div class="footer-green" style="background-color: #fffbf0; padding: 20px 30px; text-align: center; border-top: 1px solid #ffeaa7;">
                <span class="icon" style="display: inline-block; vertical-align: middle; margin-right: 8px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px; color: #856404; fill: #856404;"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 9v2m0 4v.01" /><path d="M5 19h14a2 2 0 0 0 1.84 -2.75l-7.1 -12.25a2 2 0 0 0 -3.5 0l-7.1 12.25a2 2 0 0 0 1.75 2.75" /></svg></span>
                <p style="font-size: 13px; color: #856404; margin: 0; display: inline-block; vertical-align: middle; font-weight: 500;">Please review feedback</p>
              </div>
            </div>
            
            ${data.comments ? `
            <div class="credentials-box" style="background-color: #f8f9fa; border-left: 4px solid #dc3545; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 10px 0; font-size: 14px;"><strong>Reason for Revision:</strong></p>
              <p style="margin: 10px 0; font-size: 14px;">${data.comments}</p>
            </div>
            ` : ''}
            
            <p>Please review the feedback above and contact the Local Youth Development Office if you have any questions.</p>
            
            ${data.trackingUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <p style="margin-bottom: 15px;"><strong>View Your Submission:</strong></p>
              <a href="${data.trackingUrl}" class="button" style="background: linear-gradient(135deg, #24345A 0%, #1e2a47 100%);">View Submission Details</a>
              <p style="margin-top: 10px; font-size: 12px; color: #666;">Or copy this link: ${data.trackingUrl}</p>
              <p style="margin-top: 5px; font-size: 11px; color: #999;">This link will expire in 72 hours.</p>
            </div>
            ` : ''}
            
            ${data.youthId && data.email ? `
            <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e5e7eb;">
              <p style="margin-bottom: 10px; font-size: 14px; color: #555;"><strong>Need a new link?</strong></p>
              <p style="margin-bottom: 15px; font-size: 13px; color: #666;">If your link expires or you need to resend this email, you can request a new one.</p>
              <a href="${data.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000'}/survey-submission/status?resend=true" class="button" style="background: linear-gradient(135deg, #856404 0%, #6c5200 100%); display: inline-block; padding: 10px 20px; font-size: 14px;">Resend Email</a>
              <p style="margin-top: 10px; font-size: 11px; color: #999;">You'll need your Youth ID: <strong style="font-family: monospace;">${data.youthId}</strong></p>
            </div>
            ` : ''}
            
            <p><strong>Your privacy remains protected regardless of the validation outcome.</strong></p>
            
            <a href="mailto:${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'}?subject=Survey Revision Inquiry - ${data.batchName || 'Youth Survey'}" class="button">Contact Support</a>
            
            <div class="privacy-section">
              <h3>🔒 Your Privacy & Data Protection</h3>
              <ul>
                <li><strong>Privacy Protection:</strong> Your privacy remains protected regardless of the validation outcome. All your information is handled with the same level of security and confidentiality.</li>
                <li><strong>Email Usage:</strong> Your email address is used solely to send you updates about your survey submission. We will never share, sell, or use your email for marketing purposes.</li>
                <li><strong>Data Security:</strong> All your personal information is stored securely and accessed only by authorized LYDO personnel for validation purposes.</li>
                <li><strong>Confidentiality:</strong> Your survey responses are kept confidential and used only for youth governance research and program development.</li>
                <li><strong>Your Rights:</strong> You have the right to inquire about your data, request updates, or contact us with privacy concerns at any time.</li>
                <li><strong>No Account Required:</strong> You don't need an account to participate. Your email is only used to notify you about your survey status.</li>
              </ul>
              <p style="margin-top: 15px; font-size: 14px;"><strong>If you have questions about this decision or need assistance, please contact us - we're here to help.</strong></p>
              <div style="text-align: center; margin: 20px 0; padding: 15px; background-color: #fff3cd; border-radius: 5px;">
                <p style="margin-bottom: 10px; font-weight: 600; color: #856404;">📋 Your Data Subject Rights (RA 10173)</p>
                <p style="margin-bottom: 15px; font-size: 14px; color: #555;">Under the Data Privacy Act of 2012, you have the right to access, correct, delete, or object to the processing of your personal data.</p>
                <a href="${data.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000'}/data-subject-rights" class="button" style="background: linear-gradient(135deg, #856404 0%, #6c5200 100%); margin: 0;">Request Access, Correction, or Deletion of Your Data</a>
                <p style="margin-top: 10px; font-size: 12px; color: #666;">You can submit a request anytime, and we will respond within 30 days as required by law.</p>
              </div>
            </div>
            
            <div class="privacy-notice-box">
              <h4>⚠️ Important Privacy Notice</h4>
              <p><strong>This email was sent to you because you submitted a survey using this email address.</strong> If you did not submit a survey, please ignore this email or contact us at <a href="mailto:${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'}">${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'}</a> to report this.</p>
              <p><strong>Your email address is kept confidential and is never shared with third parties.</strong></p>
              <p><strong>Questions about your data?</strong> Contact us at ${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'} or ${data.contactPhone || '(043) 123-4567'}</p>
            </div>
          </div>
          <div class="footer">
            <p><strong>Local Youth Development Office</strong></p>
            <p>Municipality of San Jose, Batangas</p>
            <p>Email: ${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'} | Phone: ${data.contactPhone || '(043) 123-4567'}</p>
            <p style="margin-top: 15px; font-size: 12px;">© ${new Date().getFullYear()} LYDO. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (data) => `
      Survey Status Update - LYDO Youth Governance
      
      Survey Review Complete
      
      We have completed the review of your survey submission. After careful consideration, your survey response could not be validated at this time.
      
      Survey Details:
      - Survey Batch: ${data.batchName || 'Youth Survey'}
      - Review Date: ${new Date(data.validationDate || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      ${data.comments ? `- Note: ${data.comments}` : ''}
      
      Your privacy remains protected regardless of the validation outcome.
      
      If you believe this is an error or have questions about the review process, please contact the Local Youth Development Office for assistance.
      
      We appreciate your interest in participating in our youth governance programs and encourage you to reach out if you need any clarification.
      
      YOUR PRIVACY & DATA PROTECTION:
      
      • Privacy Protection: Your privacy remains protected regardless of the validation outcome. All your information is handled with the same level of security and confidentiality.
      
      • Email Usage: Your email address is used solely to send you updates about your survey submission. We will never share, sell, or use your email for marketing purposes.
      
      • Data Security: All your personal information is stored securely and accessed only by authorized LYDO personnel for validation purposes.
      
      • Confidentiality: Your survey responses are kept confidential and used only for youth governance research and program development.
      
      • Your Rights: You have the right to inquire about your data, request updates, or contact us with privacy concerns at any time.
      
      • No Account Required: You don't need an account to participate. Your email is only used to notify you about your survey status.
      
      If you have questions about this decision or need assistance, please contact us - we're here to help.
      
      PRIVACY NOTICE:
      This email was sent to you because you submitted a survey using this email address. If you did not submit a survey, please ignore this email or contact us at ${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'} to report this. Your email address is kept confidential and is never shared with third parties.
      
      Questions about your data? Contact us at ${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'} or ${data.contactPhone || '(043) 123-4567'}
      
      © ${new Date().getFullYear()} Local Youth Development Office | Youth Governance System
    `
  },

  surveyPending: {
    subject: 'Survey Submission Received - LYDO Youth Governance',
    html: (data) => `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Survey Submission Received - LYDO</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; padding: 30px 20px; text-align: center; }
          .logo-container { width: 80px; height: 80px; background-color: white; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
          .logo-container img { width: 100%; height: 100%; object-fit: contain; padding: 10px; }
          .logo-text { font-weight: bold; font-size: 24px; color: #2c3e50; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
          .header p { margin: 5px 0 0; font-size: 14px; opacity: 0.9; }
          .content { padding: 40px 30px; color: #333; }
          .content h2 { color: #2c3e50; font-size: 20px; margin: 0 0 20px; text-align: center; }
          .content p { line-height: 1.6; margin: 0 0 15px; font-size: 15px; }
          .info-section { background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .info-section p { margin: 8px 0; font-size: 14px; }
          .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; margin: 10px 0; }
          .status-pending { background-color: #fff3cd; color: #856404; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; font-size: 14px; }
          .privacy-section { background-color: #f8f9fa; border-left: 4px solid #2c3e50; padding: 20px; margin: 30px 0; border-radius: 4px; }
          .privacy-section h3 { color: #2c3e50; font-size: 16px; margin: 0 0 10px; font-weight: 600; }
          .privacy-section ul { margin: 10px 0; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #555; }
          .privacy-section li { margin: 8px 0; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 13px; color: #6c757d; }
          .footer p { margin: 5px 0; }
          .privacy-notice-box { background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 30px 0; }
          .privacy-notice-box h4 { color: #92400e; font-size: 16px; font-weight: 600; margin: 0 0 12px; }
          .privacy-notice-box p { margin: 8px 0; line-height: 1.6; color: #78350f; font-size: 13px; }
          .privacy-notice-box a { color: #92400e; text-decoration: underline; font-weight: 500; }
          .footer-privacy { border-top: 1px solid #e0e0e0; margin-top: 20px; padding-top: 20px; text-align: left; }
          .footer-privacy p { margin: 8px 0; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header-top">
            <div class="header-top-container">
              <div class="header-top-right" style="margin-left: auto;">
                <a href="mailto:${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'}" class="header-top-link" style="color: rgba(255, 255, 255, 0.85); text-decoration: none; display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px; border-radius: 9999px; background-color: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.15);">
                  <span style="font-size: 12px;">✉</span>
                  <span style="font-size: 12px; letter-spacing: 0.025em;">${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'}</span>
                </a>
              </div>
            </div>
          </div>
          <div class="header-white">
            <div class="header-white-container">
              <div class="logo-container">
                ${data.logoUrl ? `<img src="${data.logoUrl}" alt="Municipality Logo" />` : '<div class="logo-text" style="font-size: 12px;">LYDO</div>'}
              </div>
              <div class="header-info">
                <h1>Municipality of San Jose, Batangas</h1>
                <p>Local Youth Development Office</p>
              </div>
            </div>
          </div>
          <div class="content">
            <h2>KK Survey Submission Received</h2>
            <p>Dear <strong>${data.userName || 'Valued Youth'}</strong>,</p>
            <p>Thank you for submitting your ${data.batchName || 'Youth Survey'} response. We have received your submission and it is currently under review.</p>
            
            <!-- Receipt Card -->
            <div class="card-container" style="max-width: 500px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08); overflow: hidden; border: 1px solid #e5e7eb;">
              <div class="header-green" style="background-color: #e3f2fd; padding: 25px 30px; text-align: center; border-bottom: 1px solid #bbdefb;">
                <span class="icon" style="display: inline-block; vertical-align: middle; margin-right: 10px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" style="width: 28px; height: 28px; color: #1976d2; fill: #1976d2;"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M9 11l2 2l4 -4" /></svg></span>
                <h2 style="font-size: 22px; color: #1976d2; margin: 0; font-weight: 600; display: inline-block; vertical-align: middle;">Submission Confirmed</h2>
                <p style="font-size: 14px; color: #1565c0; margin: 5px 0 0;">${data.batchName || 'KK Survey'}</p>
              </div>
              <div class="details-section" style="padding: 30px;">
                <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                  <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Name:</span>
                  <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word;">${data.userName || 'Valued Youth'}</span>
                </div>
                ${data.email ? `
                <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                  <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Email:</span>
                  <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word;">${data.email}</span>
                </div>
                ` : ''}
                ${data.youthId ? `
                <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                  <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Youth ID:</span>
                  <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word; font-family: monospace;">${data.youthId}</span>
                </div>
                ` : ''}
                <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                  <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Survey Batch name:</span>
                  <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word;">${data.batchName || 'Youth Survey'}</span>
                </div>
                <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                  <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Response ID:</span>
                  <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word; font-family: monospace;">${data.responseId || 'N/A'}</span>
                </div>
                <div class="details-row" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                  <span class="details-label" style="font-size: 14px; color: #555; font-weight: 500; flex-basis: 45%; text-align: left;">Submitted:</span>
                  <span class="details-value" style="font-size: 14px; color: #333; font-weight: 600; flex-basis: 55%; text-align: right; word-break: break-word;">${(() => {
                    const submittedDate = data.submittedAt || data.submissionDate || new Date();
                    const date = new Date(submittedDate);
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const year = date.getFullYear();
                    const hours = date.getHours();
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    const displayHours = hours % 12 || 12;
                    return `${month}/${day}/${year} at ${displayHours}:${minutes} ${ampm}`;
                  })()}</span>
                </div>
              </div>
              <div class="footer-green" style="background-color: #e8f4fd; padding: 20px 30px; text-align: center; border-top: 1px solid #bbdefb;">
                <span class="icon" style="display: inline-block; vertical-align: middle; margin-right: 8px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px; color: #1976d2; fill: #1976d2;"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10" /></svg></span>
                <p style="font-size: 13px; color: #1976d2; margin: 0; display: inline-block; vertical-align: middle; font-weight: 500;">Pending validation</p>
              </div>
            </div>
            
            <p>Your submission is currently pending validation by our team. You will receive another notification once your submission has been reviewed.</p>
            
            ${data.trackingUrl ? `
            <div style="text-align: center; margin: 30px 0;">
              <p style="margin-bottom: 15px;"><strong>Track Your Submission:</strong></p>
              <a href="${data.trackingUrl}" class="button" style="background: linear-gradient(135deg, #24345A 0%, #1e2a47 100%);">View Submission Status</a>
              <p style="margin-top: 10px; font-size: 12px; color: #666;">Or copy this link: ${data.trackingUrl}</p>
              <p style="margin-top: 5px; font-size: 11px; color: #999;">This link will expire in 72 hours.</p>
            </div>
            ` : ''}
            
            ${data.youthId && data.email ? `
            <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e5e7eb;">
              <p style="margin-bottom: 10px; font-size: 14px; color: #555;"><strong>Need a new link?</strong></p>
              <p style="margin-bottom: 15px; font-size: 13px; color: #666;">If your link expires or you need to resend this email, you can request a new one.</p>
              <a href="${data.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000'}/survey-submission/status?resend=true" class="button" style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); display: inline-block; padding: 10px 20px; font-size: 14px;">Resend Email</a>
              <p style="margin-top: 10px; font-size: 11px; color: #999;">You'll need your Youth ID: <strong style="font-family: monospace;">${data.youthId}</strong></p>
            </div>
            ` : ''}
            
            <p><strong>Your email is secure and will only be used to notify you about your survey status.</strong></p>
            
            <a href="mailto:${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'}?subject=Survey Status Inquiry - ${data.batchName || 'Youth Survey'}" class="button">Contact Support</a>
            
            <div class="privacy-section">
              <h3>🔒 Your Privacy & Data Protection</h3>
              <ul>
                <li><strong>Why You're Receiving This Email:</strong> You submitted a survey using this email address. This email confirms we received your submission.</li>
                <li><strong>Email Usage:</strong> Your email address is used solely to send you updates about your survey submission. We will never share, sell, or use your email for marketing purposes.</li>
                <li><strong>Data Security:</strong> All your personal information is stored securely and accessed only by authorized LYDO personnel for validation purposes. Your data is protected while under review.</li>
                <li><strong>Confidentiality:</strong> Your survey responses are kept confidential and used only for youth governance research and program development.</li>
                <li><strong>Your Rights:</strong> You have the right to inquire about your data, request updates, or contact us with privacy concerns at any time.</li>
                <li><strong>No Account Required:</strong> You don't need an account to participate. Your email is only used to notify you about your survey status.</li>
              </ul>
              <p style="margin-top: 15px; font-size: 14px;"><strong>You will receive another email notification once your submission has been reviewed (within 3-5 business days).</strong></p>
              <div style="text-align: center; margin: 20px 0; padding: 15px; background-color: #e3f2fd; border-radius: 5px;">
                <p style="margin-bottom: 10px; font-weight: 600; color: #1976d2;">📋 Your Data Subject Rights (RA 10173)</p>
                <p style="margin-bottom: 15px; font-size: 14px; color: #555;">Under the Data Privacy Act of 2012, you have the right to access, correct, delete, or object to the processing of your personal data.</p>
                <a href="${data.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000'}/data-subject-rights" class="button" style="background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); margin: 0;">Request Access, Correction, or Deletion of Your Data</a>
                <p style="margin-top: 10px; font-size: 12px; color: #666;">You can submit a request anytime, and we will respond within 30 days as required by law.</p>
              </div>
            </div>
            
            <div class="privacy-notice-box">
              <h4>⚠️ Important Privacy Notice</h4>
              <p><strong>This email was sent to you because you submitted a survey using this email address.</strong> If you did not submit a survey, please ignore this email or contact us at <a href="mailto:${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'}">${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'}</a> to report this.</p>
              <p><strong>Your email address is kept confidential and is never shared with third parties.</strong></p>
              <p><strong>Questions about your data?</strong> Contact us at ${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'} or ${data.contactPhone || '(043) 123-4567'}</p>
            </div>
            
            <p style="font-size: 13px; color: #6c757d; margin-top: 20px;">Expected processing time: 3-5 business days</p>
          </div>
          <div class="footer">
            <p><strong>Local Youth Development Office</strong></p>
            <p>Municipality of San Jose, Batangas</p>
            <p>Email: ${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'} | Phone: ${data.contactPhone || '(043) 123-4567'}</p>
            <p style="margin-top: 15px; font-size: 12px;">© ${new Date().getFullYear()} LYDO. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: (data) => `
      Survey Submission Received - LYDO Youth Governance
      
      Thank You for Your Submission!
      
      We have successfully received your survey submission. Your response is currently under review.
      
      Survey Details:
      - Survey Batch: ${data.batchName || 'Youth Survey'}
      - Submission Date: ${new Date(data.submissionDate || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      - Status: Pending Review
      
      Your email is secure and will only be used to notify you about your survey status.
      
      What happens next?
      Our team will review your survey submission. You will receive another email notification once the review is complete with the final status of your submission (within 3-5 business days).
      
      We appreciate your participation in our youth governance programs. Your input helps us better understand and serve the youth community.
      
      YOUR PRIVACY & DATA PROTECTION:
      
      • Why You're Receiving This Email: You submitted a survey using this email address. This email confirms we received your submission.
      
      • Email Usage: Your email address is used solely to send you updates about your survey submission. We will never share, sell, or use your email for marketing purposes.
      
      • Data Security: All your personal information is stored securely and accessed only by authorized LYDO personnel for validation purposes. Your data is protected while under review.
      
      • Confidentiality: Your survey responses are kept confidential and used only for youth governance research and program development.
      
      • Your Rights: You have the right to inquire about your data, request updates, or contact us with privacy concerns at any time.
      
      • No Account Required: You don't need an account to participate. Your email is only used to notify you about your survey status.
      
      You will receive another email notification once your submission has been reviewed (within 3-5 business days).
      
      PRIVACY NOTICE:
      This email was sent to you because you submitted a survey using this email address. If you did not submit a survey, please ignore this email or contact us at ${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'} to report this. Your email address is kept confidential and is never shared with third parties.
      
      Questions about your data? Contact us at ${data.contactEmail || 'lydo@sanjosebatangas.gov.ph'} or ${data.contactPhone || '(043) 123-4567'}
      
      © ${new Date().getFullYear()} Local Youth Development Office | Youth Governance System
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
    skOfficialWelcome: ['firstName', 'lastName', 'skId', 'position', 'barangayName', 'password'],
    skOfficialCreated: ['fullName', 'position', 'barangayName', 'skId', 'personalEmail', 'orgEmail', 'status', 'termName', 'createdAt'],
    termActivated: ['termName', 'termId', 'startDate', 'endDate', 'activatedAt', 'activatedBy'],
    criticalSystemAlert: ['alertType', 'severity', 'timestamp', 'description'],
    bulkOperationComplete: ['operationType', 'totalRecords', 'successCount', 'errorCount', 'startTime', 'endTime'],
    surveyValidated: ['batchName'],
    surveyRejected: ['batchName'],
    surveyPending: ['batchName']
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