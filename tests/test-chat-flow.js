/**
 * Basic Chat Flow Test
 * Tests the chat API endpoints locally.
 * 
 * Usage: npm test (requires server running on localhost:3001)
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';

async function test() {
  console.log('🧪 Testing ROX Chat API...\n');

  // Test 1: Health check
  console.log('1. Health check...');
  try {
    const res = await fetch(`${BASE_URL}/api/chat/health`);
    const data = await res.json();
    console.log(`   Status: ${data.status}`);
    console.log(`   Engine: ${data.engine}`);
    console.log(`   ✅ Health check passed\n`);
  } catch (err) {
    console.log(`   ❌ Health check failed: ${err.message}\n`);
  }

  // Test 2: Start session
  console.log('2. Start session...');
  let sessionId = null;
  try {
    const res = await fetch(`${BASE_URL}/api/chat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: 'rox-heating' })
    });
    const data = await res.json();
    sessionId = data.sessionId;
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Greeting: ${data.greeting || '(none - using welcome card)'}`);
    console.log(`   ✅ Session started\n`);
  } catch (err) {
    console.log(`   ❌ Start session failed: ${err.message}\n`);
    return;
  }

  // Test 3: Send a message
  console.log('3. Send message: "I need to schedule a repair"...');
  try {
    const res = await fetch(`${BASE_URL}/api/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        message: 'I need to schedule a repair',
        tenantId: 'rox-heating'
      })
    });
    const data = await res.json();
    console.log(`   Response: ${data.message}`);
    console.log(`   Quick replies: ${data.quickReplies?.length || 0}`);
    console.log(`   ✅ Message sent\n`);
  } catch (err) {
    console.log(`   ❌ Send message failed: ${err.message}\n`);
  }

  console.log('🏁 Tests complete.');
}

test().catch(console.error);
