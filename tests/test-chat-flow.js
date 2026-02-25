/**
 * Test Chat Flow
 * Simulates the chat widget's API calls to verify the full flow.
 * Run: node tests/test-chat-flow.js
 */

require('dotenv').config();
const chatAdapter = require('../services/chat-adapter');
const sessionStore = require('../services/chat-session-store');

async function testChatFlow() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   ROX CHAT - CONVERSATION FLOW TEST                   ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const tenantId = 'rox-heating';

  // 1. Create session
  console.log('━━━ Step 1: Start Chat Session ━━━');
  const session = await sessionStore.create(tenantId);
  console.log(`  Session ID: ${session.sessionId}`);
  console.log(`  Tenant: ${session.tenantId}`);

  // 2. Start chat
  console.log('\n━━━ Step 2: Start Chat (Welcome Message) ━━━');
  const welcome = await chatAdapter.startChat(session.sessionId, tenantId);
  console.log(`  🤖 Bot: "${welcome.text}"`);
  console.log(`  State: ${welcome.state}`);
  console.log(`  Quick Replies: ${welcome.quickReplies?.map(r => r.label).join(', ') || 'none'}`);

  // 3. Simulate user selecting "Repair"
  console.log('\n━━━ Step 3: User Selects "Repair" ━━━');
  const repair = await chatAdapter.processMessage(session.sessionId, 'I need a repair', tenantId);
  console.log(`  🤖 Bot: "${repair.text}"`);
  console.log(`  State: ${repair.state}`);
  console.log(`  Quick Replies: ${repair.quickReplies?.map(r => r.label).join(', ') || 'none'}`);

  // 4. Provide phone number
  console.log('\n━━━ Step 4: User Provides Phone ━━━');
  const phone = await chatAdapter.processMessage(session.sessionId, '303-555-1234', tenantId);
  console.log(`  🤖 Bot: "${phone.text}"`);
  console.log(`  State: ${phone.state}`);
  console.log(`  Quick Replies: ${phone.quickReplies?.map(r => r.label).join(', ') || 'none'}`);

  // 5. Continue conversation...
  const steps = [
    { input: 'My furnace is not heating', desc: 'Describe issue' },
    { input: '8 years', desc: 'System age' },
    { input: 'No', desc: 'Not ROX installed' },
    { input: 'As soon as possible', desc: 'Time preference' },
  ];

  for (const step of steps) {
    console.log(`\n━━━ User: "${step.input}" (${step.desc}) ━━━`);
    const response = await chatAdapter.processMessage(session.sessionId, step.input, tenantId);
    console.log(`  🤖 Bot: "${response.text}"`);
    console.log(`  State: ${response.state}`);
    console.log(`  Quick Replies: ${response.quickReplies?.map(r => r.label).join(', ') || 'none'}`);
    
    if (response.endChat) {
      console.log('  ✅ Chat ended');
      break;
    }
  }

  // Session stats
  console.log('\n━━━ Session Stats ━━━');
  const activeCount = await sessionStore.getActiveCount(tenantId);
  console.log(`  Active sessions: ${activeCount}`);
  console.log(`  Active chat managers: ${chatAdapter.getActiveChatCount()}`);

  // Cleanup
  chatAdapter.endChat(session.sessionId);
  await sessionStore.destroy(tenantId, session.sessionId);
  sessionStore.stopCleanup();

  console.log('\n✅ Test complete!');
}

testChatFlow().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
