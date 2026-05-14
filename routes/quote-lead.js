/**
 * Quote Lead Capture Route (Resend HTTP API)
 * Sends two emails:
 *   1. Office notification with lead details
 *   2. Customer quote summary with equipment cards and scheduling link
 * 
 * SETUP:
 *   RESEND_API_KEY=re_xxxxxxxxx
 *   QUOTE_LEAD_EMAIL_TO=office@gmail.com
 *   RESEND_FROM=ROX Quote Wizard <noreply@roxheating.com>
 */

const express = require('express');
const router = express.Router();

// Build a single equipment card for the customer email
function equipmentCard(tier, tierLabel, tierColor, name, stage, monthly, seer2, hspf2, afue, scheduleUrl) {
  const borderColor = tier === 'best' ? '#F28C28' : '#E0E0E0';
  const labelColor = tier === 'best' ? '#F28C28' : '#666';
  const bgColor = tier === 'best' ? '#FFF8F0' : '#FFFFFF';
  const badge = tier === 'best' ? '<div style="background: #F28C28; color: white; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; display: inline-block; margin-bottom: 8px;">RECOMMENDED</div><br/>' : '';

  return '<td style="width: 33%; vertical-align: top; padding: 0 6px;">' +
    '<div style="border: 2px solid ' + borderColor + '; border-radius: 12px; padding: 20px 16px; text-align: center; background: ' + bgColor + '; height: 100%;">' +
    badge +
    '<div style="font-size: 13px; font-weight: 700; letter-spacing: 1px; color: ' + labelColor + '; text-transform: uppercase; margin-bottom: 12px;">' + tierLabel + '</div>' +
    '<div style="font-size: 16px; font-weight: 700; color: #222; margin-bottom: 4px;">' + (name || '') + '</div>' +
    '<div style="font-size: 13px; color: #888; margin-bottom: 16px;">' + (stage || '') + '</div>' +
    '<div style="font-size: 12px; color: #888; margin-bottom: 4px;">Monthly Price:</div>' +
    '<div style="font-size: 24px; font-weight: 800; color: #F28C28; margin-bottom: 16px;">$' + (monthly ? monthly.toFixed(2) : '—') + '<span style="font-size: 14px; font-weight: 400;">/mo</span></div>' +
    '<table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">' +
    '<tr><td style="padding: 6px 0; font-size: 12px; color: #888; text-align: left; font-weight: 600;">SEER2</td><td style="padding: 6px 0; font-size: 13px; color: #333; text-align: right;">Up to ' + (seer2 || '—') + '</td></tr>' +
    '<tr><td style="padding: 6px 0; font-size: 12px; color: #888; text-align: left; font-weight: 600;">HSPF2</td><td style="padding: 6px 0; font-size: 13px; color: #333; text-align: right;">Up to ' + (hspf2 || '—') + '</td></tr>' +
    '<tr><td style="padding: 6px 0; font-size: 12px; color: #888; text-align: left; font-weight: 600;">AFUE</td><td style="padding: 6px 0; font-size: 13px; color: #333; text-align: right;">Up to ' + (afue || '—') + '%</td></tr>' +
    '</table>' +
    '<a href="' + scheduleUrl + '" style="display: block; background: #F28C28; color: white; text-decoration: none; padding: 12px 16px; border-radius: 8px; font-size: 14px; font-weight: 700;">Schedule a Home Visit</a>' +
    '<div style="font-size: 11px; color: #999; margin-top: 8px;">*We can customize your system during the visit</div>' +
    '</div></td>';
}

router.post('/', async (req, res) => {
  try {
    const lead = req.body;

    console.log('[quote-lead] New lead received:', JSON.stringify({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      address: lead.address,
      systemType: lead.systemType,
      homeSize: lead.homeSize,
      timestamp: lead.timestamp,
    }));

    const resendKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.QUOTE_LEAD_EMAIL_TO || 'office@gmail.com';
    const fromEmail = process.env.RESEND_FROM || 'ROX Quote Wizard <onboarding@resend.dev>';
    const scheduleUrl = process.env.QUOTE_SCHEDULE_URL || 'https://rox-chat-production.up.railway.app/widget/quote-wizard.html';

    if (!resendKey) {
      console.warn('[quote-lead] RESEND_API_KEY not set. Lead logged but email not sent.');
      return res.json({ success: true, emailSent: false });
    }

    // ================================================================
    // EMAIL 1: OFFICE NOTIFICATION
    // ================================================================
    const officeSubject = 'New Online Quote Lead: ' + (lead.name || 'Unknown');

    const officeHtml = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">' +
      '<div style="background: #F28C28; color: white; padding: 20px; border-radius: 8px 8px 0 0;">' +
      '<h2 style="margin: 0;">New Online Quote Lead</h2>' +
      '<p style="margin: 4px 0 0; opacity: 0.9;">Someone viewed pricing on the quoting wizard</p>' +
      '</div>' +
      '<div style="background: #f9f9f9; padding: 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">' +
      '<h3 style="color: #333; margin: 0 0 16px;">Customer Info</h3>' +
      '<table style="width: 100%; border-collapse: collapse;">' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold; width: 140px;">Name</td><td style="padding: 8px 0; color: #222;">' + (lead.name || 'Not provided') + '</td></tr>' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold;">Phone</td><td style="padding: 8px 0; color: #222;">' + (lead.phone || 'Not provided') + '</td></tr>' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold;">Email</td><td style="padding: 8px 0; color: #222;">' + (lead.email || 'Not provided') + '</td></tr>' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold;">Address</td><td style="padding: 8px 0; color: #222;">' + (lead.address || 'Not provided') + (lead.unit ? ' ' + lead.unit : '') + '</td></tr>' +
      '</table>' +
      '<h3 style="color: #333; margin: 24px 0 16px;">System Details</h3>' +
      '<table style="width: 100%; border-collapse: collapse;">' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold; width: 140px;">System Type</td><td style="padding: 8px 0; color: #222;">' + (lead.systemType || 'Not selected') + '</td></tr>' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold;">Home Size</td><td style="padding: 8px 0; color: #222;">' + (lead.homeSize || 'Not selected') + '</td></tr>' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold;">Unit Location</td><td style="padding: 8px 0; color: #222;">' + (lead.unitLocation || 'Not selected') + '</td></tr>' +
      '</table>' +
      '<h3 style="color: #333; margin: 24px 0 16px;">Pricing Shown</h3>' +
      '<table style="width: 100%; border-collapse: collapse;">' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold; width: 140px;">Good</td><td style="padding: 8px 0; color: #222;">' + (lead.goodName || '') + ' — $' + (lead.goodMonthly ? lead.goodMonthly.toFixed(2) : '?') + '/mo</td></tr>' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold;">Better</td><td style="padding: 8px 0; color: #222;">' + (lead.betterName || '') + ' — $' + (lead.betterMonthly ? lead.betterMonthly.toFixed(2) : '?') + '/mo</td></tr>' +
      '<tr><td style="padding: 8px 0; color: #888; font-weight: bold;">Best</td><td style="padding: 8px 0; color: #222;">' + (lead.bestName || '') + ' — $' + (lead.bestMonthly ? lead.bestMonthly.toFixed(2) : '?') + '/mo</td></tr>' +
      '</table>' +
      '<p style="color: #999; font-size: 12px; margin-top: 24px;">Captured at ' + (lead.timestamp || 'unknown time') + ' — Source: ROX Online Quoting Wizard</p>' +
      '</div></div>';

    // ================================================================
    // EMAIL 2: CUSTOMER QUOTE SUMMARY
    // ================================================================
    const firstName = (lead.name || 'there').split(' ')[0];
    const customerSubject = firstName + ', here are your HVAC pricing options from ROX Heating & Air';

    const customerHtml = '<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff;">' +
      // Header
      '<div style="background: #1A1A1A; padding: 24px 32px; text-align: center; border-radius: 8px 8px 0 0;">' +
      '<img src="https://rox-chat-production.up.railway.app/widget/rox-logo.png" alt="ROX Heating & Air" style="height: 40px; margin-bottom: 8px;" onerror="this.style.display=\'none\'" />' +
      '<div style="color: white; font-size: 20px; font-weight: 700;">ROX Heating & Air</div>' +
      '<div style="color: #999; font-size: 13px;">(720) 468-0689 &nbsp;|&nbsp; roxheating.com</div>' +
      '</div>' +
      // Greeting
      '<div style="padding: 32px 24px 16px; text-align: center;">' +
      '<h1 style="font-size: 24px; color: #222; margin: 0 0 8px;">Your Personalized Quote</h1>' +
      '<p style="font-size: 15px; color: #666; margin: 0;">Hi ' + firstName + '! Based on the info you provided, here are your system options with monthly financing:</p>' +
      '</div>' +
      // System info bar
      '<div style="background: #F5F5F5; margin: 0 24px; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">' +
      '<table style="width: 100%; border-collapse: collapse;">' +
      '<tr><td style="font-size: 13px; color: #888; padding: 3px 0;">System Type</td><td style="font-size: 13px; color: #333; text-align: right; font-weight: 600; padding: 3px 0;">' + (lead.systemType || '—') + '</td></tr>' +
      '<tr><td style="font-size: 13px; color: #888; padding: 3px 0;">Home Size</td><td style="font-size: 13px; color: #333; text-align: right; font-weight: 600; padding: 3px 0;">' + (lead.homeSize || '—') + '</td></tr>' +
      '<tr><td style="font-size: 13px; color: #888; padding: 3px 0;">Address</td><td style="font-size: 13px; color: #333; text-align: right; font-weight: 600; padding: 3px 0;">' + (lead.address || '—') + '</td></tr>' +
      '</table></div>' +
      // Equipment cards
      '<div style="padding: 0 18px;">' +
      '<table style="width: 100%; border-collapse: separate; border-spacing: 0;" cellpadding="0" cellspacing="0"><tr>' +
      equipmentCard('good', 'Good', '#666', lead.goodName, lead.goodStage || 'Single Stage', lead.goodMonthly, lead.goodSeer2, lead.goodHspf2, lead.goodAfue, scheduleUrl) +
      equipmentCard('better', 'Better', '#666', lead.betterName, lead.betterStage || '2 Stage', lead.betterMonthly, lead.betterSeer2, lead.betterHspf2, lead.betterAfue, scheduleUrl) +
      equipmentCard('best', 'Best', '#F28C28', lead.bestName, lead.bestStage || 'Inverter', lead.bestMonthly, lead.bestSeer2, lead.bestHspf2, lead.bestAfue, scheduleUrl) +
      '</tr></table></div>' +
      // Financing note
      '<div style="text-align: center; padding: 20px 24px 8px;">' +
      '<p style="font-size: 12px; color: #999; margin: 0;">*Monthly prices based on approved financing. Final pricing confirmed during your free home visit.</p>' +
      '</div>' +
      // CTA section
      '<div style="text-align: center; padding: 16px 24px 32px;">' +
      '<div style="background: #FFF8F0; border: 2px solid #F28C28; border-radius: 12px; padding: 24px;">' +
      '<h2 style="font-size: 20px; color: #222; margin: 0 0 8px;">Ready to take the next step?</h2>' +
      '<p style="font-size: 14px; color: #666; margin: 0 0 16px;">Schedule a free home visit and a comfort advisor will verify the details and finalize your custom quote — no obligation.</p>' +
      '<a href="' + scheduleUrl + '" style="display: inline-block; background: #F28C28; color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 700;">Schedule Your Free Home Visit</a>' +
      '<p style="font-size: 13px; color: #888; margin: 12px 0 0;">Or call us directly: <a href="tel:7204680689" style="color: #F28C28; font-weight: 600; text-decoration: none;">(720) 468-0689</a></p>' +
      '</div></div>' +
      // Footer
      '<div style="background: #F5F5F5; padding: 20px 24px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #E8E8E8;">' +
      '<p style="font-size: 12px; color: #999; margin: 0;">ROX Heating & Air &nbsp;|&nbsp; Littleton, CO &nbsp;|&nbsp; (720) 468-0689</p>' +
      '<p style="font-size: 11px; color: #BBB; margin: 8px 0 0;">You received this email because you requested a quote on roxheating.com</p>' +
      '</div></div>';

    // ================================================================
    // SEND BOTH EMAILS
    // ================================================================

    // Send office notification
    const officeRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + resendKey },
      body: JSON.stringify({ from: fromEmail, to: [toEmail], subject: officeSubject, html: officeHtml }),
    });
    if (officeRes.ok) {
      const d = await officeRes.json();
      console.log('[quote-lead] Office email sent to ' + toEmail + ' (id: ' + d.id + ')');
    } else {
      const err = await officeRes.text();
      console.error('[quote-lead] Office email error (' + officeRes.status + '): ' + err);
    }

    // Send customer quote summary (only if customer provided an email)
    if (lead.email && lead.email.includes('@')) {
      const custRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + resendKey },
        body: JSON.stringify({ from: fromEmail, to: [lead.email], subject: customerSubject, html: customerHtml }),
      });
      if (custRes.ok) {
        const d = await custRes.json();
        console.log('[quote-lead] Customer email sent to ' + lead.email + ' (id: ' + d.id + ')');
      } else {
        const err = await custRes.text();
        console.error('[quote-lead] Customer email error (' + custRes.status + '): ' + err);
      }
    }

    res.json({ success: true, emailSent: true });
  } catch (error) {
    console.error('[quote-lead] Error:', error.message);
    res.json({ success: true });
  }
});

module.exports = router;
