/**
 * Quote Lead Capture Route
 * 
 * Add this to your rox-chat Express server to receive leads
 * from the quoting wizard and email them to your team.
 * 
 * SETUP:
 * 1. Copy this file to your rox-chat project: routes/quote-lead.js
 * 2. Install nodemailer:  npm install nodemailer
 * 3. Add environment variables to Railway (see below)
 * 4. Wire it into your server.js (see bottom of this file)
 * 
 * ENVIRONMENT VARIABLES (add in Railway dashboard → Variables):
 *   QUOTE_LEAD_EMAIL_TO=office@gmail.com
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=office@gmail.com
 *   SMTP_PASS=your-gmail-app-password
 * 
 * HOW TO GET A GMAIL APP PASSWORD:
 *   1. Go to myaccount.google.com → Security
 *   2. Turn on 2-Step Verification (if not already on)
 *   3. Go to myaccount.google.com/apppasswords
 *   4. Select "Mail" and "Other (Custom name)" → type "ROX Lead Notifications"
 *   5. Click Generate → copy the 16-character password
 *   6. Paste it as SMTP_PASS in Railway
 */

const express = require('express');
const router = express.Router();

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.warn('[quote-lead] nodemailer not installed. Run: npm install nodemailer');
}

// POST /api/quote-lead
router.post('/', async (req, res) => {
  try {
    const lead = req.body;

    // Always log the lead (backup in case email fails)
    console.log('[quote-lead] New lead received:', JSON.stringify({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      address: lead.address,
      systemType: lead.systemType,
      homeSize: lead.homeSize,
      timestamp: lead.timestamp,
    }));

    // Send email notification
    if (nodemailer && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const toEmail = process.env.QUOTE_LEAD_EMAIL_TO || 'office@gmail.com';
      const subject = `New Online Quote Lead: ${lead.name || 'Unknown'}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #F28C28; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">New Online Quote Lead</h2>
            <p style="margin: 4px 0 0; opacity: 0.9;">Someone viewed pricing on the quoting wizard</p>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
            <h3 style="color: #333; margin: 0 0 16px;">Customer Info</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #888; font-weight: bold; width: 140px;">Name</td>
                <td style="padding: 8px 0; color: #222;">${lead.name || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-weight: bold;">Phone</td>
                <td style="padding: 8px 0; color: #222;">${lead.phone || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-weight: bold;">Email</td>
                <td style="padding: 8px 0; color: #222;">${lead.email || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-weight: bold;">Address</td>
                <td style="padding: 8px 0; color: #222;">${lead.address || 'Not provided'}${lead.unit ? ' ' + lead.unit : ''}</td>
              </tr>
            </table>

            <h3 style="color: #333; margin: 24px 0 16px;">System Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #888; font-weight: bold; width: 140px;">System Type</td>
                <td style="padding: 8px 0; color: #222;">${lead.systemType || 'Not selected'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-weight: bold;">Home Size</td>
                <td style="padding: 8px 0; color: #222;">${lead.homeSize || 'Not selected'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-weight: bold;">Unit Location</td>
                <td style="padding: 8px 0; color: #222;">${lead.unitLocation || 'Not selected'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-weight: bold;">Energy Source</td>
                <td style="padding: 8px 0; color: #222;">${lead.energySource || 'Not selected'}</td>
              </tr>
            </table>

            <h3 style="color: #333; margin: 24px 0 16px;">Pricing Shown</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #888; font-weight: bold; width: 140px;">Good</td>
                <td style="padding: 8px 0; color: #222;">${lead.goodName || ''} — $${lead.goodMonthly ? lead.goodMonthly.toFixed(2) : '?'}/mo</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-weight: bold;">Better</td>
                <td style="padding: 8px 0; color: #222;">${lead.betterName || ''} — $${lead.betterMonthly ? lead.betterMonthly.toFixed(2) : '?'}/mo</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-weight: bold;">Best</td>
                <td style="padding: 8px 0; color: #222;">${lead.bestName || ''} — $${lead.bestMonthly ? lead.bestMonthly.toFixed(2) : '?'}/mo</td>
              </tr>
            </table>

            <p style="color: #999; font-size: 12px; margin-top: 24px;">
              This lead was captured at ${lead.timestamp || 'unknown time'}.<br/>
              The customer viewed pricing but has not yet booked a home visit.<br/>
              Source: ROX Online Quoting Wizard
            </p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: `"ROX Quote Wizard" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: subject,
        html: html,
      });

      console.log(`[quote-lead] Email sent to ${toEmail} for lead: ${lead.name}`);
    } else {
      console.warn('[quote-lead] Email not configured. Set SMTP_USER and SMTP_PASS env vars.');
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[quote-lead] Error:', error.message);
    // Still return success — don't block the wizard if email fails
    res.json({ success: true });
  }
});

module.exports = router;

/**
 * =============================================
 * HOW TO WIRE THIS INTO YOUR SERVER
 * =============================================
 * 
 * In your main server.js (or index.js), add these 2 lines:
 * 
 *   const quoteLeadRoute = require('./routes/quote-lead');
 *   app.use('/api/quote-lead', quoteLeadRoute);
 * 
 * That's it. The quoting wizard will POST lead data to:
 *   https://rox-chat-production.up.railway.app/api/quote-lead
 * 
 * And you'll get an email at office@gmail.com every time
 * someone views their quote results.
 */
