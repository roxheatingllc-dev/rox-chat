/**
 * Quote Lead Capture Route (v2 - SendGrid HTTP API)
 * 
 * Sends lead notification emails when someone views pricing on the quoting wizard.
 * Uses SendGrid HTTP API instead of SMTP — works on Railway and all cloud hosts.
 * 
 * SETUP:
 * 1. Sign up at https://sendgrid.com (free = 100 emails/day)
 * 2. Create an API key: Settings → API Keys → Create API Key (Full Access)
 * 3. Verify a sender: Settings → Sender Authentication → Single Sender Verification
 *    (verify office@gmail.com or whatever "from" address you want)
 * 4. Add environment variables to Railway:
 *      SENDGRID_API_KEY=SG.xxxxxxxxx
 *      QUOTE_LEAD_EMAIL_TO=office@gmail.com
 *      QUOTE_LEAD_EMAIL_FROM=office@gmail.com
 * 
 * No npm packages needed — uses built-in fetch.
 */

const express = require('express');
const router = express.Router();

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

    const sgKey = process.env.SENDGRID_API_KEY;
    const toEmail = process.env.QUOTE_LEAD_EMAIL_TO || 'office@gmail.com';
    const fromEmail = process.env.QUOTE_LEAD_EMAIL_FROM || 'office@gmail.com';

    if (!sgKey) {
      console.warn('[quote-lead] SENDGRID_API_KEY not set. Lead logged but email not sent.');
      return res.json({ success: true, emailSent: false });
    }

    const subject = 'New Online Quote Lead: ' + (lead.name || 'Unknown');

    const html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
      '<div style="background: #F28C28; color: white; padding: 20px; border-radius: 8px 8px 0 0;">' +
      '<h2 style="margin: 0;">New Online Quote Lead</h2>' +
      '<p style="margin: 4px 0 0; opacity: 0.9;">Someone viewed pricing on the quoting wizard</p>' +
      '</div>' +
      '<div style="background: #f9f9f9; padding: 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">' +
      '<h3 style="color: #333; margin: 0 0 16px;">Customer Info</h3>' +
      '<table style="width: 100%; border-collapse: collapse;">' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold; width: 140px;">Name</td>' +
      '<td style="padding: 8px 0; color: #222;">' + (lead.name || 'Not provided') + '</td></tr>' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold;">Phone</td>' +
      '<td style="padding: 8px 0; color: #222;">' + (lead.phone || 'Not provided') + '</td></tr>' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold;">Email</td>' +
      '<td style="padding: 8px 0; color: #222;">' + (lead.email || 'Not provided') + '</td></tr>' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold;">Address</td>' +
      '<td style="padding: 8px 0; color: #222;">' + (lead.address || 'Not provided') + (lead.unit ? ' ' + lead.unit : '') + '</td></tr>' +
      '</table>' +
      '<h3 style="color: #333; margin: 24px 0 16px;">System Details</h3>' +
      '<table style="width: 100%; border-collapse: collapse;">' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold; width: 140px;">System Type</td>' +
      '<td style="padding: 8px 0; color: #222;">' + (lead.systemType || 'Not selected') + '</td></tr>' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold;">Home Size</td>' +
      '<td style="padding: 8px 0; color: #222;">' + (lead.homeSize || 'Not selected') + '</td></tr>' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold;">Unit Location</td>' +
      '<td style="padding: 8px 0; color: #222;">' + (lead.unitLocation || 'Not selected') + '</td></tr>' +
      '</table>' +
      '<h3 style="color: #333; margin: 24px 0 16px;">Pricing Shown</h3>' +
      '<table style="width: 100%; border-collapse: collapse;">' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold; width: 140px;">Good</td>' +
      '<td style="padding: 8px 0; color: #222;">' + (lead.goodName || '') + ' — $' + (lead.goodMonthly ? lead.goodMonthly.toFixed(2) : '?') + '/mo</td></tr>' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold;">Better</td>' +
      '<td style="padding: 8px 0; color: #222;">' + (lead.betterName || '') + ' — $' + (lead.betterMonthly ? lead.betterMonthly.toFixed(2) : '?') + '/mo</td></tr>' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold;">Best</td>' +
      '<td style="padding: 8px 0; color: #222;">' + (lead.bestName || '') + ' — $' + (lead.bestMonthly ? lead.bestMonthly.toFixed(2) : '?') + '/mo</td></tr>' +
      '</table>' +
      '<p style="color: #999; font-size: 12px; margin-top: 24px;">' +
      'This lead was captured at ' + (lead.timestamp || 'unknown time') + '.<br/>' +
      'The customer viewed pricing but has not yet booked a home visit.<br/>' +
      'Source: ROX Online Quoting Wizard</p>' +
      '</div></div>';

    // Send via SendGrid HTTP API (no SMTP needed — works on Railway)
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + sgKey,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toEmail }] }],
        from: { email: fromEmail, name: 'ROX Quote Wizard' },
        subject: subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });

    if (response.status === 202) {
      console.log('[quote-lead] Email sent via SendGrid to ' + toEmail + ' for lead: ' + lead.name);
      res.json({ success: true, emailSent: true });
    } else {
      const errBody = await response.text();
      console.error('[quote-lead] SendGrid error (' + response.status + '): ' + errBody);
      res.json({ success: true, emailSent: false });
    }
  } catch (error) {
    console.error('[quote-lead] Error:', error.message);
    res.json({ success: true });
  }
});

module.exports = router;
