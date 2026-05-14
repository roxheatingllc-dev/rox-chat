/**
 * Quote Lead Capture Route (Resend HTTP API)
 * Sends two emails:
 *   1. Detailed office notification with equipment specs and click-to-call/email
 *   2. Customer quote summary with equipment cards and scheduling link
 *
 * ENV VARS:
 *   RESEND_API_KEY=re_xxxxxxxxx
 *   QUOTE_LEAD_EMAIL_TO=office@gmail.com
 *   RESEND_FROM=ROX Quote Wizard <noreply@roxheating.com>
 *   QUOTE_SCHEDULE_URL=https://www.roxheating.com/get-a-quote
 */

const express = require('express');
const router = express.Router();

function equipmentCard(tier, tierLabel, name, stage, monthly, seer2, hspf2, afue, bookDirectUrl) {
  const borderColor = tier === 'best' ? '#F28C28' : '#E0E0E0';
  const labelColor = tier === 'best' ? '#F28C28' : '#666';
  const bgColor = tier === 'best' ? '#FFF8F0' : '#FFFFFF';
  const badge = tier === 'best' ? '<div style="background: #F28C28; color: white; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; display: inline-block; margin-bottom: 8px;">RECOMMENDED</div><br/>' : '';

  return '<td style="width: 33%; vertical-align: top; padding: 0 6px;">' +
    '<div style="border: 2px solid ' + borderColor + '; border-radius: 12px; padding: 20px 16px; text-align: center; background: ' + bgColor + ';">' +
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
    '<div style="font-size: 11px; color: #999; margin-top: 8px;">*We can customize during the visit</div>' +
    '</div></td>';
}

function officeEquipmentRow(tierLabel, tierColor, name, stage, monthly, seer2, hspf2, afue) {
  return '<tr>' +
    '<td style="padding: 12px 16px; border-bottom: 1px solid #EEE;">' +
    '<div style="font-size: 12px; font-weight: 700; color: ' + tierColor + '; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">' + tierLabel + '</div>' +
    '<div style="font-size: 15px; font-weight: 700; color: #222;">' + (name || '—') + '</div>' +
    '<div style="font-size: 13px; color: #888;">' + (stage || '') + '</div>' +
    '</td>' +
    '<td style="padding: 12px 16px; border-bottom: 1px solid #EEE; text-align: center; vertical-align: middle;">' +
    '<div style="font-size: 20px; font-weight: 800; color: #F28C28;">$' + (monthly ? monthly.toFixed(2) : '—') + '<span style="font-size: 13px; font-weight: 400; color: #888;">/mo</span></div>' +
    '</td>' +
    '<td style="padding: 12px 16px; border-bottom: 1px solid #EEE; vertical-align: middle;">' +
    '<div style="font-size: 12px; color: #666;">SEER2: <strong>' + (seer2 || '—') + '</strong></div>' +
    '<div style="font-size: 12px; color: #666;">HSPF2: <strong>' + (hspf2 || '—') + '</strong></div>' +
    '<div style="font-size: 12px; color: #666;">AFUE: <strong>' + (afue || '—') + '%</strong></div>' +
    '</td></tr>';
}

router.post('/', async (req, res) => {
  try {
    const lead = req.body;

    console.log('[quote-lead] New lead received:', JSON.stringify({
      name: lead.name, phone: lead.phone, email: lead.email,
      address: lead.address, systemType: lead.systemType,
      homeSize: lead.homeSize, timestamp: lead.timestamp,
    }));

    const resendKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.QUOTE_LEAD_EMAIL_TO || 'office@gmail.com';
    const fromEmail = process.env.RESEND_FROM || 'ROX Quote Wizard <onboarding@resend.dev>';
    const scheduleUrl = (process.env.QUOTE_SCHEDULE_URL || 'https://rox-chat-production.up.railway.app/widget/quote-wizard.html') + (process.env.QUOTE_SCHEDULE_URL ? '' : '?book=true');
    const bookDirectUrl = 'https://rox-chat-production.up.railway.app/widget/quote-wizard.html?book=true';

    if (!resendKey) {
      console.warn('[quote-lead] RESEND_API_KEY not set. Lead logged but email not sent.');
      return res.json({ success: true, emailSent: false });
    }

    const phoneDigits = (lead.phone || '').replace(/\D/g, '');

    // ================================================================
    // EMAIL 1: OFFICE NOTIFICATION (DETAILED)
    // ================================================================
    const officeSubject = 'New Online Quote Lead: ' + (lead.name || 'Unknown');

    const officeHtml = '<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">' +
      // Header
      '<div style="background: #F28C28; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0;">' +
      '<h2 style="margin: 0; font-size: 20px;">New Online Quote Lead</h2>' +
      '<p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">Someone viewed pricing on the quoting wizard</p>' +
      '</div>' +
      // Quick actions bar
      '<div style="background: #333; padding: 14px 24px; display: flex;">' +
      '<table style="width: 100%;"><tr>' +
      '<td style="text-align: center;"><a href="tel:' + phoneDigits + '" style="color: white; text-decoration: none; font-size: 14px; font-weight: 600;">📞 Call ' + (lead.phone || '') + '</a></td>' +
      '<td style="text-align: center;"><a href="mailto:' + (lead.email || '') + '" style="color: white; text-decoration: none; font-size: 14px; font-weight: 600;">✉️ Email ' + (lead.email || '') + '</a></td>' +
      '</tr></table></div>' +
      // Customer details
      '<div style="background: #f9f9f9; padding: 24px; border: 1px solid #e5e5e5; border-top: none;">' +
      '<h3 style="color: #333; margin: 0 0 16px; font-size: 16px;">Customer Details</h3>' +
      '<table style="width: 100%; border-collapse: collapse;">' +
      '<tr><td style="padding: 10px 0; color: #888; font-weight: bold; width: 120px; font-size: 13px; border-bottom: 1px solid #EEE;">Name</td><td style="padding: 10px 0; color: #222; font-size: 15px; font-weight: 600; border-bottom: 1px solid #EEE;">' + (lead.name || 'Not provided') + '</td></tr>' +
      '<tr><td style="padding: 10px 0; color: #888; font-weight: bold; font-size: 13px; border-bottom: 1px solid #EEE;">Phone</td><td style="padding: 10px 0; border-bottom: 1px solid #EEE;"><a href="tel:' + phoneDigits + '" style="color: #F28C28; font-size: 15px; font-weight: 600; text-decoration: none;">' + (lead.phone || 'Not provided') + '</a></td></tr>' +
      '<tr><td style="padding: 10px 0; color: #888; font-weight: bold; font-size: 13px; border-bottom: 1px solid #EEE;">Email</td><td style="padding: 10px 0; border-bottom: 1px solid #EEE;"><a href="mailto:' + (lead.email || '') + '" style="color: #F28C28; font-size: 15px; font-weight: 600; text-decoration: none;">' + (lead.email || 'Not provided') + '</a></td></tr>' +
      '<tr><td style="padding: 10px 0; color: #888; font-weight: bold; font-size: 13px; border-bottom: 1px solid #EEE;">Address</td><td style="padding: 10px 0; color: #222; font-size: 15px; border-bottom: 1px solid #EEE;">' + (lead.address || 'Not provided') + (lead.unit ? ' ' + lead.unit : '') + '</td></tr>' +
      '</table>' +
      // System details
      '<h3 style="color: #333; margin: 24px 0 16px; font-size: 16px;">System Details</h3>' +
      '<table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #EEE;">' +
      '<tr><td style="padding: 10px 16px; color: #888; font-weight: bold; font-size: 13px; border-bottom: 1px solid #EEE; width: 140px;">System Type</td><td style="padding: 10px 16px; color: #222; font-size: 14px; font-weight: 600; border-bottom: 1px solid #EEE;">' + (lead.systemType || 'Not selected') + '</td></tr>' +
      '<tr><td style="padding: 10px 16px; color: #888; font-weight: bold; font-size: 13px; border-bottom: 1px solid #EEE;">Home Size</td><td style="padding: 10px 16px; color: #222; font-size: 14px; font-weight: 600; border-bottom: 1px solid #EEE;">' + (lead.homeSize || 'Not selected') + '</td></tr>' +
      '<tr><td style="padding: 10px 16px; color: #888; font-weight: bold; font-size: 13px;">Unit Location</td><td style="padding: 10px 16px; color: #222; font-size: 14px; font-weight: 600;">' + (lead.unitLocation || 'Not selected') + '</td></tr>' +
      '</table>' +
      // Equipment options
      '<h3 style="color: #333; margin: 24px 0 16px; font-size: 16px;">Equipment Options Shown</h3>' +
      '<table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #EEE;">' +
      '<tr style="background: #F5F5F5;"><td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #888; border-bottom: 1px solid #EEE;">EQUIPMENT</td><td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #888; text-align: center; border-bottom: 1px solid #EEE;">MONTHLY</td><td style="padding: 10px 16px; font-size: 12px; font-weight: 700; color: #888; border-bottom: 1px solid #EEE;">SPECS</td></tr>' +
      officeEquipmentRow('Good', '#666', lead.goodName, lead.goodStage || 'Single Stage', lead.goodMonthly, lead.goodSeer2, lead.goodHspf2, lead.goodAfue) +
      officeEquipmentRow('Better', '#2563EB', lead.betterName, lead.betterStage || '2 Stage', lead.betterMonthly, lead.betterSeer2, lead.betterHspf2, lead.betterAfue) +
      officeEquipmentRow('Best ⭐', '#F28C28', lead.bestName, lead.bestStage || 'Inverter', lead.bestMonthly, lead.bestSeer2, lead.bestHspf2, lead.bestAfue) +
      '</table>' +
      '</div>' +
      // Footer
      '<div style="background: #F5F5F5; padding: 16px 24px; border-radius: 0 0 8px 8px; border: 1px solid #e5e5e5; border-top: none;">' +
      '<table style="width: 100%;"><tr>' +
      '<td style="font-size: 12px; color: #999;">Captured: ' + (lead.timestamp || 'unknown') + '</td>' +
      '<td style="font-size: 12px; color: #999; text-align: right;">Source: Online Quoting Wizard</td>' +
      '</tr></table>' +
      '<p style="font-size: 11px; color: #BBB; margin: 8px 0 0; text-align: center;">Customer has NOT booked a home visit yet. Follow up recommended.</p>' +
      '</div></div>';

    // ================================================================
    // EMAIL 2: CUSTOMER QUOTE SUMMARY
    // ================================================================
    const firstName = (lead.name || 'there').split(' ')[0];
    const customerSubject = firstName + ', here are your HVAC pricing options from ROX Heating & Air';

    const customerHtml = '<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff;">' +
      '<div style="background: #1A1A1A; padding: 24px 32px; text-align: center; border-radius: 8px 8px 0 0;">' +
      '<img src="https://rox-chat-production.up.railway.app/widget/rox-logo.png" alt="ROX Heating & Air" style="height: 40px; margin-bottom: 8px;" onerror="this.style.display=\'none\'" />' +
      '<div style="color: white; font-size: 20px; font-weight: 700;">ROX Heating & Air</div>' +
      '<div style="color: #999; font-size: 13px;">(720) 468-0689 &nbsp;|&nbsp; roxheating.com</div>' +
      '</div>' +
      '<div style="padding: 32px 24px 16px; text-align: center;">' +
      '<h1 style="font-size: 24px; color: #222; margin: 0 0 8px;">Your Personalized Quote</h1>' +
      '<p style="font-size: 15px; color: #666; margin: 0;">Hi ' + firstName + '! Based on the info you provided, here are your system options with monthly financing:</p>' +
      '</div>' +
      '<div style="background: #F5F5F5; margin: 0 24px; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">' +
      '<table style="width: 100%; border-collapse: collapse;">' +
      '<tr><td style="font-size: 13px; color: #888; padding: 3px 0;">System Type</td><td style="font-size: 13px; color: #333; text-align: right; font-weight: 600; padding: 3px 0;">' + (lead.systemType || '—') + '</td></tr>' +
      '<tr><td style="font-size: 13px; color: #888; padding: 3px 0;">Home Size</td><td style="font-size: 13px; color: #333; text-align: right; font-weight: 600; padding: 3px 0;">' + (lead.homeSize || '—') + '</td></tr>' +
      '<tr><td style="font-size: 13px; color: #888; padding: 3px 0;">Address</td><td style="font-size: 13px; color: #333; text-align: right; font-weight: 600; padding: 3px 0;">' + (lead.address || '—') + '</td></tr>' +
      '</table></div>' +
      '<div style="padding: 0 18px;">' +
      '<table style="width: 100%; border-collapse: separate; border-spacing: 0;" cellpadding="0" cellspacing="0"><tr>' +
      equipmentCard('good', 'Good', lead.goodName, lead.goodStage || 'Single Stage', lead.goodMonthly, lead.goodSeer2, lead.goodHspf2, lead.goodAfue, bookDirectUrl) +
      equipmentCard('better', 'Better', lead.betterName, lead.betterStage || '2 Stage', lead.betterMonthly, lead.betterSeer2, lead.betterHspf2, lead.betterAfue, bookDirectUrl) +
      equipmentCard('best', 'Best', lead.bestName, lead.bestStage || 'Inverter', lead.bestMonthly, lead.bestSeer2, lead.bestHspf2, lead.bestAfue, bookDirectUrl) +
      '</tr></table></div>' +
      '<div style="text-align: center; padding: 20px 24px 8px;">' +
      '<p style="font-size: 12px; color: #999; margin: 0;">*Monthly prices based on approved financing. Final pricing confirmed during your free home visit.</p>' +
      '</div>' +
      '<div style="text-align: center; padding: 16px 24px 32px;">' +
      '<div style="background: #FFF8F0; border: 2px solid #F28C28; border-radius: 12px; padding: 24px;">' +
      '<h2 style="font-size: 20px; color: #222; margin: 0 0 8px;">Ready to take the next step?</h2>' +
      '<p style="font-size: 14px; color: #666; margin: 0 0 16px;">Schedule a free home visit and a comfort advisor will verify the details and finalize your custom quote — no obligation.</p>' +
      '<a href="' + scheduleUrl + '" style="display: inline-block; background: #F28C28; color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: 700;">Schedule Your Free Home Visit</a>' +
      '<p style="font-size: 13px; color: #888; margin: 12px 0 0;">Or call us directly: <a href="tel:7204680689" style="color: #F28C28; font-weight: 600; text-decoration: none;">(720) 468-0689</a></p>' +
      '</div></div>' +
      '<div style="background: #F5F5F5; padding: 20px 24px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #E8E8E8;">' +
      '<p style="font-size: 12px; color: #999; margin: 0;">ROX Heating & Air &nbsp;|&nbsp; Littleton, CO &nbsp;|&nbsp; (720) 468-0689</p>' +
      '<p style="font-size: 11px; color: #BBB; margin: 8px 0 0;">You received this email because you requested a quote on roxheating.com</p>' +
      '</div></div>';

    // ================================================================
    // SEND BOTH EMAILS
    // ================================================================
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
