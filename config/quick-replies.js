/**
 * Quick Replies Configuration
 * Maps conversation states to suggested button shortcuts.
 * The "hybrid" magic: AI understands free text, but buttons speed things up.
 */

module.exports = {
  // Initial greeting - main service options
  initial: [
    { label: '🔧 Repair', value: 'I need to schedule a repair' },
    { label: '📊 Estimate', value: "I'd like an estimate for a new system" },
    { label: '🛠️ Maintenance', value: 'I need to schedule maintenance' },
    { label: '📅 My Appointment', value: 'I have a question about my appointment' }
  ],

  // Yes/No confirmations
  confirm: [
    { label: '✅ Yes', value: 'Yes' },
    { label: '❌ No', value: 'No' }
  ],

  // Appointment actions
  appointmentActions: [
    { label: '📅 Reschedule', value: 'I need to reschedule' },
    { label: '❌ Cancel', value: 'I need to cancel' },
    { label: '❓ Check Status', value: "What's the status of my appointment?" }
  ],

  // System type
  systemType: [
    { label: '❄️ AC / Cooling', value: 'Air conditioner' },
    { label: '🔥 Furnace / Heating', value: 'Furnace' },
    { label: '🚿 Water Heater', value: 'Water heater' },
    { label: '💧 Humidifier', value: 'Humidifier' }
  ],

  // Schedule preference
  schedulePreference: [
    { label: '📅 This Week', value: 'This week' },
    { label: '📅 Next Week', value: 'Next week' },
    { label: '⚡ ASAP', value: 'As soon as possible' }
  ],

  // Time preference
  timePreference: [
    { label: '🌅 Morning', value: 'Morning' },
    { label: '☀️ Afternoon', value: 'Afternoon' },
    { label: '🌆 Any Time', value: 'Any time works' }
  ],

  // Estimate timeline
  estimateTimeline: [
    { label: '⚡ ASAP', value: 'As soon as possible' },
    { label: '📅 This Month', value: 'Sometime this month' },
    { label: '🤔 Just Exploring', value: "I'm just exploring options" }
  ],

  // End of conversation
  finalQuestions: [
    { label: "✅ That's all!", value: "No, that's all. Thank you!" },
    { label: '❓ One More Question', value: 'I have another question' }
  ],

  // Anything else for the tech
  additionalNotes: [
    { label: "✅ Nothing else", value: "No, that's it" },
    { label: '📝 Add a Note', value: 'Yes, I want to add a note for the technician' }
  ]
};
