import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { renderTemplate, validateTemplateData } from './emailTemplates.js';
import logger from '../utils/logger.js';

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
      logger.debug('Checking email environment variables', {
        EMAIL_HOST: process.env.EMAIL_HOST ? 'Set' : 'Missing',
        EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Missing',
        EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Missing',
        EMAIL_PORT: process.env.EMAIL_PORT || 'Using default 587',
        EMAIL_SECURE: process.env.EMAIL_SECURE || 'Using default false'
      });
      
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        logger.warn('Email configuration not found. Email service will be disabled', {
          recommendation: 'Please set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables'
        });
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
      logger.info('Email service initialized successfully', {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        user: process.env.EMAIL_USER,
        secure: process.env.EMAIL_SECURE === 'true',
        isConfigured: this.isConfigured
      });
      
    } catch (error) {
      logger.error('Email service initialization failed', { error: error.message, stack: error.stack });
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
    logger.debug(`Email service status: configured=${this.isConfigured}`);
    
    if (!this.isConfigured) {
      logger.warn('Email service not configured. Skipping welcome email', {
        recommendation: 'Check EMAIL_HOST, EMAIL_USER, and EMAIL_PASS environment variables'
      });
      return false;
    }

    try {
      const { firstName, lastName, personalEmail, orgEmail, password, lydoId } = staffData;
      
      // Validate personalEmail is provided
      if (!personalEmail || typeof personalEmail !== 'string' || personalEmail.trim() === '') {
        logger.error('Invalid personalEmail provided', { personalEmail, staffData: {
          firstName,
          lastName,
          personalEmail,
          orgEmail,
          lydoId,
          hasPassword: !!password
        }});
        return false;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(personalEmail.trim())) {
        logger.error('Invalid email format for personalEmail', { personalEmail });
        return false;
      }

      logger.info(`Preparing welcome email for ${firstName} ${lastName}`, { lydoId, to: personalEmail.trim(), from: process.env.EMAIL_USER });
      
      const mailOptions = {
        from: `"LYDO Youth Governance" <${process.env.EMAIL_USER}>`,
        to: personalEmail.trim(),
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

      logger.debug('Sending email via SMTP', { to: personalEmail.trim() });
      const result = await this.transporter.sendMail(mailOptions);
      
      logger.debug('SMTP accepted email for delivery', {
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
        pending: result.pending,
        response: result.response,
        responseCode: result.responseCode,
        envelope: result.envelope
      });
      
      // Check if email was actually accepted
      if (result.rejected && result.rejected.length > 0) {
        logger.error('Email was rejected by SMTP server', { rejected: result.rejected });
        return false;
      }
      
      if (!result.accepted || result.accepted.length === 0) {
        logger.error('Email was not accepted by SMTP server', { result: JSON.stringify(result, null, 2) });
        return false;
      }

      logger.info(`Welcome email sent to ${personalEmail.trim()}`, {
        messageId: result.messageId,
        config: {
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT || 587,
          user: process.env.EMAIL_USER,
          from: mailOptions.from,
          to: mailOptions.to,
          subject: mailOptions.subject
        }
      });
      
      // Important note about email delivery
      logger.info(`Email successfully queued for delivery to ${personalEmail.trim()}`, {
        note: 'Email delivery may take 5-15 minutes (sometimes longer). This is normal for Gmail and cloud providers like Render. If email doesn\'t arrive, check spam/junk folder'
      });
      
      return true;

    } catch (error) {
      logger.error('Failed to send welcome email', {
        error: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        stack: error.stack,
        personalEmail: staffData.personalEmail,
        lydoId: staffData.lydoId
      });
      
      // Check for specific error types
      if (error.code === 'EAUTH') {
        logger.error('Authentication failed. Check EMAIL_USER and EMAIL_PASS (app password for Gmail)');
      } else if (error.code === 'ECONNECTION') {
        logger.error('Connection failed. Check EMAIL_HOST and EMAIL_PORT');
      } else if (error.code === 'ETIMEDOUT') {
        logger.error('Connection timeout. Check network connectivity');
      }
      
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
      logger.warn('Email service not configured. Skipping SK welcome email');
      return false;
    }

    try {
      const { first_name, last_name, personal_email, org_email, password, sk_id, position, barangay_name } = skData;
      
      // Use the new template system
      const emailData = {
        firstName: first_name,
        lastName: last_name,
        skId: sk_id,
        position: position,
        barangayName: barangay_name,
        password: password,
        orgEmail: org_email
      };

      return await this.sendTemplatedEmail(
        'skOfficialWelcome',
        emailData,
        personal_email
      );

    } catch (error) {
      logger.error('Failed to send SK welcome email', { error: error.message, stack: error.stack, skId: skData.sk_id });
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
      logger.warn('Email service not configured. Skipping admin notification');
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
      logger.info(`Admin notification sent to ${adminEmail}`, { messageId: result.messageId });
      return true;

    } catch (error) {
      logger.error('Failed to send admin notification', { error: error.message, stack: error.stack, adminEmail });
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
      logger.warn('Email service not configured. Skipping password reset email');
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
      logger.info(`Password reset email sent to ${email}`, { messageId: result.messageId });
      return true;

    } catch (error) {
      logger.error('Failed to send password reset email', { error: error.message, stack: error.stack, email });
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
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request - LYDO Youth Governance</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #1f2937; 
            background-color: #f3f4f6;
            padding: 20px;
          }
          .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #24345A 0%, #1e2a47 100%);
            color: white;
            padding: 32px 24px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            opacity: 0.1;
            background-image: 
              radial-gradient(circle at 20% 20%, rgba(255,255,255,0.2) 1px, transparent 1px),
              radial-gradient(circle at 80% 80%, rgba(255,255,255,0.15) 1px, transparent 1px);
            background-size: 40px 40px;
          }
          .header h1 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
            position: relative;
            z-index: 1;
          }
          .header p {
            font-size: 14px;
            opacity: 0.9;
            position: relative;
            z-index: 1;
          }
          .content {
            padding: 40px 32px;
            background-color: #ffffff;
          }
          .content h2 {
            font-size: 22px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 16px;
          }
          .content p {
            font-size: 15px;
            color: #4b5563;
            margin-bottom: 16px;
            line-height: 1.7;
          }
          .button-container {
            text-align: center;
            margin: 32px 0;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #24345A 0%, #1e2a47 100%);
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(36, 52, 90, 0.2);
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(36, 52, 90, 0.3);
          }
          .link-box {
            background-color: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
            word-break: break-all;
          }
          .link-box p {
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 8px;
          }
          .link-box a {
            color: #24345A;
            text-decoration: none;
            font-size: 13px;
            word-break: break-all;
          }
          .info-box {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            margin: 24px 0;
            border-radius: 4px;
          }
          .info-box p {
            font-size: 14px;
            color: #92400e;
            margin-bottom: 0;
          }
          .warning-box {
            background-color: #fee2e2;
            border-left: 4px solid #ef4444;
            padding: 16px;
            margin: 24px 0;
            border-radius: 4px;
          }
          .warning-box p {
            font-size: 14px;
            color: #991b1b;
            margin-bottom: 0;
          }
          .footer {
            background-color: #f9fafb;
            padding: 24px 32px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          .footer p {
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 8px;
          }
          .footer .logo-text {
            font-weight: 700;
            color: #24345A;
            font-size: 16px;
            margin-bottom: 8px;
          }
          @media only screen and (max-width: 600px) {
            body { padding: 10px; }
            .content { padding: 24px 20px; }
            .header { padding: 24px 20px; }
            .header h1 { font-size: 20px; }
            .button { padding: 12px 24px; font-size: 14px; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            <h1>Password Reset Request</h1>
            <p>LYDO Youth Governance System</p>
          </div>
          
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>You have requested to reset your password for the <strong>LYDO Youth Governance System</strong>.</p>
            
            <p>Click the button below to securely reset your password:</p>
            
            <div class="button-container">
            <a href="${data.resetUrl}" class="button">Reset Password</a>
            </div>
            
            <div class="link-box">
              <p><strong>Or copy and paste this link in your browser:</strong></p>
              <a href="${data.resetUrl}">${data.resetUrl}</a>
            </div>
            
            <div class="info-box">
              <p><strong>⏰ Important:</strong> This reset link will expire in <strong>1 hour</strong> for security reasons.</p>
            </div>
            
            <div class="warning-box">
              <p><strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
            </div>
          </div>
          
          <div class="footer">
            <p class="logo-text">Local Youth Development Office</p>
            <p>Municipality of San Jose, Batangas</p>
            <p style="margin-top: 12px;">Email: lydo@sanjosebatangas.gov.ph</p>
            <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">© ${new Date().getFullYear()} LYDO. All rights reserved.</p>
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
Password Reset Request - LYDO Youth Governance System

Reset Your Password

You have requested to reset your password for the LYDO Youth Governance System.

Click the link below to securely reset your password:
${data.resetUrl}

IMPORTANT: This reset link will expire in 1 hour for security reasons.

SECURITY NOTICE: If you didn't request this password reset, please ignore this email. Your account remains secure.

---
Local Youth Development Office
Municipality of San Jose, Batangas
Email: lydo@sanjosebatangas.gov.ph
© ${new Date().getFullYear()} LYDO. All rights reserved.
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
      logger.warn(`Email service not configured. Skipping ${templateName} email`);
      return false;
    }

    try {
      // Add common data fields to all emails
      const emailData = {
        ...data,
        logoUrl: data.logoUrl || process.env.EMAIL_LOGO_URL || process.env.MUNICIPALITY_LOGO_URL || null,
        frontendUrl: data.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000',
        contactEmail: data.contactEmail || process.env.CONTACT_EMAIL || 'lydo@sanjosebatangas.gov.ph',
        contactPhone: data.contactPhone || process.env.CONTACT_PHONE || '(043) 123-4567'
      };

      // Validate template data
      const validation = validateTemplateData(templateName, emailData);
      if (!validation.isValid) {
        throw new Error(`Invalid template data for ${templateName}: Missing fields: ${validation.missingFields.join(', ')}`);
      }

      // Render template
      const rendered = renderTemplate(templateName, emailData);
      
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
      logger.info(`Template email '${templateName}' sent to ${toEmail}`, { messageId: result.messageId });
      return true;

    } catch (error) {
      logger.error(`Failed to send template email '${templateName}'`, { error: error.message, stack: error.stack, templateName, toEmail });
      return false;
    }
  }

  /**
   * Send generic email with custom HTML content
   * @param {object} emailOptions - Email options
   * @param {string} emailOptions.to - Recipient email address
   * @param {string} emailOptions.subject - Email subject
   * @param {string} emailOptions.html - HTML content
   * @param {string} [emailOptions.from] - Sender email (optional)
   * @param {string} [emailOptions.text] - Plain text content (optional)
   * @returns {Promise<boolean>} Success status
   */
  async sendEmail(emailOptions) {
    if (!this.isConfigured) {
      logger.warn('Email service not configured. Skipping email');
      return false;
    }

    try {
      // Validate required fields
      if (!emailOptions || !emailOptions.to || !emailOptions.subject || !emailOptions.html) {
        logger.error('Invalid email options: missing required fields', { requiredFields: ['to', 'subject', 'html'], received: Object.keys(emailOptions || {}) });
        return false;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailOptions.to.trim())) {
        logger.error('Invalid email format for recipient', { email: emailOptions.to });
        return false;
      }

      logger.debug(`Preparing email to ${emailOptions.to.trim()}`, { subject: emailOptions.subject });

      const mailOptions = {
        from: emailOptions.from || `"LYDO Youth Governance" <${process.env.EMAIL_USER}>`,
        to: emailOptions.to.trim(),
        subject: emailOptions.subject,
        html: emailOptions.html,
        text: emailOptions.text || emailOptions.html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version if not provided
      };

      logger.debug('Sending email via SMTP', { to: emailOptions.to.trim() });
      const result = await this.transporter.sendMail(mailOptions);
      
      logger.debug('SMTP accepted email for delivery', {
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
        pending: result.pending,
        response: result.response,
        responseCode: result.responseCode,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email', {
        error: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        stack: error.stack,
        to: emailOptions.to
      });
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
      logger.warn('Email service not configured. Cannot send critical alert');
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
      
      logger.info(`Critical alert sent to ${successCount}/${recipients.length} recipients`, { successCount, total: recipients.length });
      return successCount > 0;

    } catch (error) {
      logger.error('Failed to send critical alert', { error: error.message, stack: error.stack });
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
      
      logger.info(`Term activation email sent to ${successCount}/${recipients.length} recipients`, { successCount, total: recipients.length });
      return successCount > 0;

    } catch (error) {
      logger.error('Failed to send term activation emails', { error: error.message, stack: error.stack });
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

}

// Create singleton instance
const emailService = new EmailService();

export default emailService;
