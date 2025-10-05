import fetch from 'node-fetch';

async function testCreateAnnouncement() {
  try {
    console.log('🔄 Testing create announcement endpoint...');
    
    const testData = {
      title: 'Test Announcement',
      content: 'This is a test announcement content',
      summary: 'Test summary',
      category: 'programs',
      status: 'draft',
      is_featured: false,
      is_pinned: false
    };
    
    console.log('📤 Sending request with data:', testData);
    
    const response = await fetch('http://localhost:3001/api/announcements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will fail auth but we'll see the error
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📊 Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Create announcement test passed');
    } else {
      console.log('❌ Create announcement test failed');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testCreateAnnouncement()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

