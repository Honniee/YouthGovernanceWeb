import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { renderTemplate, validateTemplateData } from './emailTemplates.js';

dotenv.config();

/**
 * Email Service for Staff Management
 * Handles sending welcome emails, credentials, and notifications
 */

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.ready = this.init();
  }

  /**
   * Initialize email transporter
   */
  async init() {
    try {
      // Check if email configuration exists
      console.log('🔍 Checking email environment variables:', {
        EMAIL_HOST: process.env.EMAIL_HOST ? '✅ Set' : '❌ Missing',
        EMAIL_USER: process.env.EMAIL_USER ? '✅ Set' : '❌ Missing',
        EMAIL_PASS: process.env.EMAIL_PASS ? '✅ Set' : '❌ Missing',
        EMAIL_PORT: process.env.EMAIL_PORT || 'Using default 587',
        EMAIL_SECURE: process.env.EMAIL_SECURE || 'Using default false'
      });
      
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('⚠️ Email configuration not found. Email service will be disabled.');
        console.log('💡 Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables');
        this.isConfigured = false;
        return;
      }

      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false // For development/testing
        }
      });

      // Verify connection
      await this.transporter.verify();
      this.isConfigured = true;
      console.log('✅ Email service initialized successfully');
          console.log('📧 Email configuration:', {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      user: process.env.EMAIL_USER,
      secure: process.env.EMAIL_SECURE === 'true',
      isConfigured: this.isConfigured
    });
      
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      this.isConfigured = false;
    }
  }

  /**
   * Send welcome email to new staff member with credentials
   * @param {object} staffData - Staff member information
   * @param {string} staffData.firstName - Staff first name
   * @param {string} staffData.lastName - Staff last name
   * @param {string} staffData.personalEmail - Personal email to send credentials to
   * @param {string} staffData.orgEmail - Organizational email for login
   * @param {string} staffData.password - Generated password
   * @param {string} staffData.lydoId - LYDO ID
   * @returns {Promise<boolean>} Success status
   */
  async sendWelcomeEmail(staffData) {
    console.log(`🔍 Email service status: configured=${this.isConfigured}`);
    
    if (!this.isConfigured) {
      console.log('⚠️ Email service not configured. Skipping welcome email.');
      console.log('💡 Check EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables');
      return false;
    }

    try {
      const { firstName, lastName, personalEmail, orgEmail, password, lydoId } = staffData;
      console.log(`📧 Preparing welcome email for ${firstName} ${lastName} (${lydoId}) to ${personalEmail}`);
      
      const mailOptions = {
        from: `"LYDO Youth Governance" <${process.env.EMAIL_USER}>`,
        to: personalEmail,
        subject: 'Welcome to LYDO - Your Account Credentials',
        html: this.generateWelcomeEmailHTML({
          firstName,
          lastName,
          orgEmail,
          password,
          lydoId
        }),
        text: this.generateWelcomeEmailText({
          firstName,
          lastName,
          orgEmail,
          password,
          lydoId
        })
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${personalEmail}`, result.messageId);
      console.log(`📧 Email service details:`, {
        host: process.env.EMAIL_HOST,
        user: process.env.EMAIL_USER,
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        messageId: result.messageId,
        response: result.response
      });
      return true;

    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      return false;
    }
  }

  /**
   * Send welcome email to new SK Official with credentials
   * @param {object} skData - SK Official information
   * @param {string} skData.first_name - SK Official first name
   * @param {string} skData.last_name - SK Official last name
   * @param {string} skData.personal_email - Personal email to send credentials to
   * @param {string} skData.org_email - Organizational email for login
   * @param {string} skData.password - Generated password
   * @param {string} skData.sk_id - SK ID
   * @param {string} skData.position - SK position
   * @param {string} skData.barangay_name - Barangay name
   * @returns {Promise<boolean>} Success status
   */
  async sendSKWelcomeEmail(skData) {
    if (!this.isConfigured) {
      console.log('⚠️ Email service not configured. Skipping SK welcome email.');
      return false;
    }

    try {
      const { first_name, last_name, personal_email, org_email, password, sk_id, position, barangay_name } = skData;
      
      const mailOptions = {
        from: `"LYDO Youth Governance" <${process.env.EMAIL_USER}>`,
        to: personal_email,
        subject: 'Welcome to SK Governance - Your Account Credentials',
        html: this.generateSKWelcomeEmailHTML({
          firstName: first_name,
          lastName: last_name,
          orgEmail: org_email,
          password,
          skId: sk_id,
          position,
          barangayName: barangay_name
        }),
        text: this.generateSKWelcomeEmailText({
          firstName: first_name,
          lastName: last_name,
          orgEmail: org_email,
          password,
          skId: sk_id,
          position,
          barangayName: barangay_name
        })
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ SK welcome email sent to ${personal_email}`, result.messageId);
      return true;

    } catch (error) {
      console.error('❌ Failed to send SK welcome email:', error);
      return false;
    }
  }

  /**
   * Send admin notification about staff actions
   * @param {object} notificationData - Notification information
   * @param {string} notificationData.action - Action performed (create, update, deactivate)
   * @param {string} notificationData.staffName - Name of staff member
   * @param {string} notificationData.adminEmail - Admin email to notify
   * @param {string} notificationData.details - Additional details
   * @returns {Promise<boolean>} Success status
   */
  async sendAdminNotification(notificationData) {
    if (!this.isConfigured) {
      console.log('⚠️ Email service not configured. Skipping admin notification.');
      return false;
    }

    try {
      const { action, staffName, adminEmail, details } = notificationData;
      
      const mailOptions = {
        from: `"LYDO System" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject: `Staff Management Alert: ${action} - ${staffName}`,
        html: this.generateAdminNotificationHTML({
          action,
          staffName,
          details
        }),
        text: this.generateAdminNotificationText({
          action,
          staffName,
          details
        })
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Admin notification sent to ${adminEmail}`, result.messageId);
      return true;

    } catch (error) {
      console.error('❌ Failed to send admin notification:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   * @param {object} resetData - Password reset information
   * @param {string} resetData.email - User's email
   * @param {string} resetData.resetToken - Password reset token
   * @param {string} resetData.resetUrl - Password reset URL
   * @returns {Promise<boolean>} Success status
   */
  async sendPasswordResetEmail(resetData) {
    if (!this.isConfigured) {
      console.log('⚠️ Email service not configured. Skipping password reset email.');
      return false;
    }

    try {
      const { email, resetToken, resetUrl } = resetData;
      
      const mailOptions = {
        from: `"LYDO System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Request - LYDO Youth Governance',
        html: this.generatePasswordResetHTML({
          resetUrl,
          resetToken
        }),
        text: this.generatePasswordResetText({
          resetUrl,
          resetToken
        })
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${email}`, result.messageId);
      return true;

    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return false;
    }
  }

  /**
   * Generate HTML welcome email
   */
  generateWelcomeEmailHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to LYDO</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .credentials { background: #e5e7eb; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to LYDO Youth Governance</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.firstName} ${data.lastName}!</h2>
            <p>Welcome to the Local Youth Development Office (LYDO) Youth Governance System!</p>
            <p>Your account has been created successfully. Here are your login credentials:</p>
            
            <div class="credentials">
              <h3>🔑 Your Login Credentials</h3>
              <p><strong>LYDO ID:</strong> ${data.lydoId}</p>
              <p><strong>Email:</strong> ${data.orgEmail}</p>
              <p><strong>Password:</strong> ${data.password}</p>
            </div>
            
            <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
            
            <p>You can now access the system at: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">LYDO Youth Governance Portal</a></p>
            
            <p>If you have any questions, please contact your administrator.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from the LYDO Youth Governance System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text welcome email
   */
  generateWelcomeEmailText(data) {
    return `
Welcome to LYDO Youth Governance

Hello ${data.firstName} ${data.lastName}!

Welcome to the Local Youth Development Office (LYDO) Youth Governance System!

Your account has been created successfully. Here are your login credentials:

Your Login Credentials:
- LYDO ID: ${data.lydoId}
- Email: ${data.orgEmail}
- Password: ${data.password}

Important: Please change your password after your first login for security purposes.

You can now access the system at: ${process.env.FRONTEND_URL || 'http://localhost:3000'}

If you have any questions, please contact your administrator.

This is an automated message from the LYDO Youth Governance System.
Please do not reply to this email.
    `;
  }

  /**
   * Generate HTML admin notification
   */
  generateAdminNotificationHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Staff Management Alert</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .alert { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Staff Management Alert</h1>
          </div>
          <div class="content">
            <h2>Action: ${data.action}</h2>
            <p>A staff management action has been performed:</p>
            
            <div class="alert">
              <p><strong>Staff Member:</strong> ${data.staffName}</p>
              <p><strong>Action:</strong> ${data.action}</p>
              <p><strong>Details:</strong> ${data.details}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <p>Please review this action in the admin dashboard.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text admin notification
   */
  generateAdminNotificationText(data) {
    return `
Staff Management Alert

Action: ${data.action}

A staff management action has been performed:

Staff Member: ${data.staffName}
Action: ${data.action}
Details: ${data.details}
Time: ${new Date().toLocaleString()}

Please review this action in the admin dashboard.
    `;
  }

  /**
   * Generate HTML password reset email
   */
  generatePasswordResetHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset Request</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>You have requested to reset your password for the LYDO Youth Governance System.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <a href="${data.resetUrl}" class="button">Reset Password</a>
            
            <p>Or copy and paste this link in your browser:</p>
            <p>${data.resetUrl}</p>
            
            <p><strong>Note:</strong> This link will expire in 1 hour for security reasons.</p>
            
            <p>If you didn't request this password reset, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text password reset email
   */
  generatePasswordResetText(data) {
    return `
Password Reset Request

Reset Your Password

You have requested to reset your password for the LYDO Youth Governance System.

Click the link below to reset your password:
${data.resetUrl}

Note: This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email.
    `;
  }

  /**
   * Test email service configuration
   */
  async testConnection() {
    try {
      // Ensure initialization finished
      if (this.ready) {
        await this.ready;
      }
      if (!this.isConfigured) {
        return { success: false, message: 'Email service not configured' };
      }
      await this.transporter.verify();
      return { success: true, message: 'Email service connection verified' };
    } catch (error) {
      return { success: false, message: `Connection failed: ${error.message}` };
    }
  }

  /**
   * Send templated email using predefined templates
   * @param {string} templateName - Template name
   * @param {object} data - Template data
   * @param {string} toEmail - Recipient email
   * @param {object} options - Additional options
   * @returns {Promise<boolean>} Success status
   */
  async sendTemplatedEmail(templateName, data, toEmail, options = {}) {
    if (!this.isConfigured) {
      console.log(`⚠️ Email service not configured. Skipping ${templateName} email.`);
      return false;
    }

    try {
      // Validate template data
      const validation = validateTemplateData(templateName, data);
      if (!validation.isValid) {
        throw new Error(`Invalid template data for ${templateName}: Missing fields: ${validation.missingFields.join(', ')}`);
      }

      // Render template
      const rendered = renderTemplate(templateName, data);
      
      const mailOptions = {
        from: options.from || `"LYDO Youth Governance" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: options.subject || rendered.subject,
        html: rendered.html,
        text: rendered.text,
        priority: options.priority || 'normal', // 'high', 'normal', 'low'
        ...options.additionalOptions
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Template email '${templateName}' sent to ${toEmail}`, result.messageId);
      return true;

    } catch (error) {
      console.error(`❌ Failed to send template email '${templateName}':`, error);
      return false;
    }
  }

  /**
   * Send critical system alert email
   * @param {object} alertData - Alert information
   * @param {Array<string>} recipients - Email recipients
   * @returns {Promise<boolean>} Success status
   */
  async sendCriticalAlert(alertData, recipients) {
    if (!this.isConfigured) {
      console.log('⚠️ Email service not configured. Cannot send critical alert.');
      return false;
    }

    try {
      const templateData = {
        alertType: alertData.alertType || 'System Error',
        severity: alertData.severity || 'Critical',
        timestamp: alertData.timestamp || new Date().toISOString(),
        description: alertData.description || 'A critical system error has occurred',
        errorMessage: alertData.errorMessage || null
      };

      // Send to all recipients
      const sendPromises = recipients.map(email => 
        this.sendTemplatedEmail('criticalSystemAlert', templateData, email, {
          priority: 'high'
        })
      );

      const results = await Promise.all(sendPromises);
      const successCount = results.filter(result => result).length;
      
      console.log(`📧 Critical alert sent to ${successCount}/${recipients.length} recipients`);
      return successCount > 0;

    } catch (error) {
      console.error('❌ Failed to send critical alert:', error);
      return false;
    }
  }

  /**
   * Send enhanced welcome email using new template
   * @param {object} staffData - Staff member information
   * @returns {Promise<boolean>} Success status
   */
  async sendEnhancedWelcomeEmail(staffData) {
    return this.sendTemplatedEmail('staffWelcome', staffData, staffData.personalEmail);
  }

  /**
   * Send SK official creation notification
   * @param {object} skData - SK Official data
   * @param {string} recipientEmail - Recipient email
   * @returns {Promise<boolean>} Success status
   */
  async sendSKOfficialCreatedEmail(skData, recipientEmail) {
    return this.sendTemplatedEmail('skOfficialCreated', skData, recipientEmail);
  }

  /**
   * Send term activation notification
   * @param {object} termData - Term data
   * @param {Array<string>} recipients - Email recipients
   * @returns {Promise<boolean>} Success status
   */
  async sendTermActivationEmail(termData, recipients) {
    try {
      const sendPromises = recipients.map(email => 
        this.sendTemplatedEmail('termActivated', termData, email, {
          priority: 'high'
        })
      );

      const results = await Promise.all(sendPromises);
      const successCount = results.filter(result => result).length;
      
      console.log(`📧 Term activation email sent to ${successCount}/${recipients.length} recipients`);
      return successCount > 0;

    } catch (error) {
      console.error('❌ Failed to send term activation emails:', error);
      return false;
    }
  }

  /**
   * Get email statistics and status
   * @returns {object} Email service statistics
   */
  getEmailStats() {
    return {
      isConfigured: this.isConfigured,
      host: process.env.EMAIL_HOST || 'Not configured',
      user: process.env.EMAIL_USER || 'Not configured',
      availableTemplates: [
        'staffWelcome',
        'skOfficialCreated', 
        'termActivated',
        'criticalSystemAlert',
        'bulkOperationComplete'
      ]
    };
  }

  /**
   * Generate HTML welcome email for SK Officials
   */
  generateSKWelcomeEmailHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to SK Governance</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f0fdf4; }
          .credentials { background: #dcfce7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #059669; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          .position-badge { background: #10b981; color: white; padding: 5px 10px; border-radius: 15px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏛️ Welcome to SK Governance</h1>
            <p>Sangguniang Kabataan Management System</p>
          </div>
          <div class="content">
            <h2>Congratulations ${data.firstName} ${data.lastName}! 🎉</h2>
            <p>You have been successfully appointed as <span class="position-badge">${data.position}</span> for <strong>Barangay ${data.barangayName}</strong>.</p>
            <p>Your SK Official account has been created in the LYDO Youth Governance System.</p>
            
            <div class="credentials">
              <h3>🔑 Your SK Official Credentials</h3>
              <p><strong>SK ID:</strong> ${data.skId}</p>
              <p><strong>Position:</strong> ${data.position}</p>
              <p><strong>Barangay:</strong> ${data.barangayName}</p>
              <p><strong>Organization Email:</strong> ${data.orgEmail}</p>
              <p><strong>Temporary Password:</strong> ${data.password}</p>
            </div>
            
            <p><strong>⚠️ Important Security Notice:</strong></p>
            <ul>
              <li>Please change your password immediately after your first login</li>
              <li>Keep your credentials secure and never share them</li>
              <li>Use your organization email for official SK communications</li>
            </ul>
            
            <p>You can now access the SK Governance system at: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="color: #059669; font-weight: bold;">SK Governance Portal</a></p>
            
            <p>As an SK Official, you will have access to:</p>
            <ul>
              <li>Youth survey validation and management</li>
              <li>Community project tracking</li>
              <li>SK meeting and event coordination</li>
              <li>Youth engagement programs</li>
            </ul>
            
            <p>If you have any questions or need assistance, please contact the LYDO administration.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from the LYDO Youth Governance System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate plain text welcome email for SK Officials
   */
  generateSKWelcomeEmailText(data) {
    return `
Welcome to SK Governance - Sangguniang Kabataan Management System

Congratulations ${data.firstName} ${data.lastName}!

You have been successfully appointed as ${data.position} for Barangay ${data.barangayName}.

Your SK Official account has been created in the LYDO Youth Governance System.

Your SK Official Credentials:
- SK ID: ${data.skId}
- Position: ${data.position}
- Barangay: ${data.barangayName}
- Organization Email: ${data.orgEmail}
- Temporary Password: ${data.password}

IMPORTANT SECURITY NOTICE:
- Please change your password immediately after your first login
- Keep your credentials secure and never share them
- Use your organization email for official SK communications

You can now access the SK Governance system at: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login

As an SK Official, you will have access to:
- Youth survey validation and management
- Community project tracking
- SK meeting and event coordination
- Youth engagement programs

If you have any questions or need assistance, please contact the LYDO administration.

This is an automated message from the LYDO Youth Governance System.
Please do not reply to this email.
    `;
  }
}

// Create singleton instance
const emailService = new EmailService();

export default emailService;
