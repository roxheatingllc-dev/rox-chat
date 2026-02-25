/**
 * Quick Replies Configuration
 * 
 * Maps conversation states to suggested button options.
 * This is what makes the chatbot "hybrid" - AI understands free text,
 * but buttons give users fast, guided paths through the flow.
 * 
 * MULTI-TENANT READY: Override per tenant for industry-specific options.
 * E.g., plumber tenant would have "Drain Cleaning" instead of "Furnace"
 */

// ============================================
// STATE → QUICK REPLY MAPPING
// ============================================
const STATE_QUICK_REPLIES = {

  // After greeting (existing customer with address)
  address_confirm: [
    { label: "Yes, that's correct", value: 'yes' },
    { label: 'Different address', value: 'no, different address' },
  ],

  // After greeting (existing customer with upcoming appointment)
  existing_appointment: [
    { label: 'About my appointment', value: 'yes, about my appointment' },
    { label: 'Something new', value: 'something new' },
  ],

  // Appointment actions
  appointment_action: [
    { label: 'Reschedule', value: 'reschedule' },
    { label: 'Cancel', value: 'cancel' },
    { label: 'Something else', value: 'something else' },
  ],

  // Main issue discovery - what do they need?
  issue_discovery: [
    { label: '🔧 Repair / Service', value: 'I need a repair' },
    { label: '🔄 Maintenance / Tune-up', value: 'I need maintenance' },
    { label: '💰 New Installation Estimate', value: 'I want a new installation estimate' },
  ],

  // What system type?
  system_type: [
    { label: '🔥 Furnace / Heater', value: 'furnace' },
    { label: '❄️ AC / Cooling', value: 'air conditioner' },
    { label: '🚿 Water Heater', value: 'water heater' },
    { label: '💧 Humidifier', value: 'humidifier' },
  ],

  // System age
  system_age: [
    { label: '1-2 years', value: '2 years' },
    { label: '3-5 years', value: '4 years' },
    { label: '6-9 years', value: '7 years' },
    { label: '10+ years', value: '12 years' },
  ],

  // Time in home (when they don't know system age)
  time_in_home: [
    { label: 'Less than 2 years', value: '1 year' },
    { label: '3-5 years', value: '4 years' },
    { label: '6-10 years', value: '7 years' },
    { label: '10+ years', value: '12 years' },
  ],

  // ROX installed?
  rox_installed: [
    { label: 'Yes, ROX installed it', value: 'yes' },
    { label: 'No', value: 'no' },
    { label: "Not sure", value: "I'm not sure" },
  ],

  // Install date (warranty check)
  install_date: [
    { label: 'Within the last year', value: 'about 1 year ago' },
    { label: '1-2 years ago', value: 'about 2 years ago' },
    { label: 'Over 2 years ago', value: 'over 2 years ago' },
    { label: "Not sure", value: "I'm not sure" },
  ],

  // Estimate timeline
  estimate_timeline: [
    { label: 'ASAP', value: 'as soon as possible' },
    { label: 'Within 2 weeks', value: 'within 2 weeks' },
    { label: 'Within a month', value: 'within a month' },
    { label: 'Just exploring', value: 'just exploring options' },
  ],

  // Heat pump question
  heat_pump_question: [
    { label: 'Yes, tell me more!', value: "yes, I'm familiar" },
    { label: "Not really", value: "no, I'm not familiar" },
  ],

  // Scheduling - time preference
  time_preference: [
    { label: 'As Soon As Possible', value: 'as soon as possible' },
    { label: 'This week', value: 'this week' },
    { label: 'Next week', value: 'next week' },
  ],

  // Slot offered - accept or decline
  offer_slot: [
    { label: '✅ Yes, that works!', value: 'yes' },
    { label: '❌ Different time', value: 'no, a different time' },
  ],

  // Additional notes for technician
  additional_notes: [
    { label: "No, that's everything", value: "no, that's all" },
  ],

  // Email collection
  collect_email: [
    { label: 'Skip for now', value: 'no email' },
  ],

  // Confirm booking
  confirm_booking: [
    { label: '✅ Confirm Booking', value: 'yes, confirm' },
    { label: 'Change something', value: 'no, I want to change something' },
  ],

  // Reschedule time
  reschedule_time: [
    { label: 'As Soon As Possible', value: 'as soon as possible' },
    { label: 'This week', value: 'this week' },
    { label: 'Next week', value: 'next week' },
  ],

  // Reschedule slot offer
  reschedule_slot_offer: [
    { label: '✅ Yes, that works!', value: 'yes' },
    { label: '❌ Different time', value: 'no, a different time' },
  ],

  // Cancel confirmation
  cancel_confirm: [
    { label: 'Yes, cancel it', value: 'yes, cancel' },
    { label: "No, keep it", value: "no, keep it" },
  ],

  // Install confirm (existing estimate)
  install_confirm: [
    { label: 'Yes, from an existing estimate', value: 'yes' },
    { label: 'No, I need a new estimate', value: 'no' },
  ],

  // Office callback offer
  office_callback_offer: [
    { label: 'Yes, have them call me', value: 'yes' },
    { label: "No thanks, I'll call back", value: 'no' },
  ],

  // Final questions
  final_questions: [
    { label: 'Nope, all set!', value: "no, that's all" },
    { label: 'Yes, one more thing', value: 'yes' },
  ],

  // Multi-system estimate (e.g., furnace + water heater)
  multi_estimate_check: [
    { label: 'Yes, add another system', value: 'yes' },
    { label: 'No, just the one', value: 'no' },
  ],

  // Urgent scheduling (12+ year system)
  urgent_schedule_preference: [
    { label: 'Today if possible', value: 'today' },
    { label: 'As Soon As Possible', value: 'as soon as possible' },
    { label: 'Specific day', value: 'a specific day' },
  ],
};


// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get quick replies for a conversation state.
 * Returns null if no quick replies are configured for this state.
 * 
 * @param {string} state - Current conversation state
 * @param {Object} session - Session data (for context-aware replies)
 * @returns {Array|null} Quick reply buttons or null
 */
function getQuickReplies(state, session = {}) {
  const replies = STATE_QUICK_REPLIES[state];
  
  if (!replies) return null;
  
  // Return a copy to prevent mutation
  return replies.map(r => ({ ...r }));
}

/**
 * Check if a state expects free-text input (no buttons)
 * These states need the user to type their actual data
 */
function isFreeTextState(state) {
  const freeTextStates = [
    'new_customer_name',
    'new_customer_address',
    'service_area_check',
    'collect_email',
    'customer_lookup_phone',
    'customer_lookup_email',
    'phone_collect',       // Chat-specific: collect phone for lookup
  ];
  return freeTextStates.includes(state);
}

module.exports = {
  STATE_QUICK_REPLIES,
  getQuickReplies,
  isFreeTextState,
};
