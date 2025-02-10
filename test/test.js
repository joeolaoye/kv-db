const autocannon = require('autocannon');

const baseUrl = 'http://localhost:3000';
const storedKeys = []; // Store successfully PUT keys
const totalKeys = 10000; // Number of keys to PUT

async function runPutTest() {
  console.log('Running PUT test...');
 await autocannon({
    url: baseUrl,
    connections: 50, // High concurrency for PUT
    duration: 10,
    requests: Array.from({ length: totalKeys }, (_, i) => ({
      method: 'POST',
      path: `/put`,
      body: JSON.stringify({ value: `value-${i}`, key: `key-${i}` }),
      headers: { 'Content-Type': 'application/json' },
      onResponse: (statusCode, body, context) => {
        if (statusCode >= 200 && statusCode < 300) {
          storedKeys.push(`key-${i}`);
        }
      }
    }))
  });

  console.log(`PUT Test Complete. Stored ${storedKeys.length} keys.`);
}

async function runReadDeleteTest() {
  console.log('Running READ/DELETE test...');
  if (storedKeys.length === 0) {
    console.log('No keys to test. Exiting.');
    return;
  }

  const godInstance = await autocannon({
    url: baseUrl,
    connections: 100,
    duration: 20,
    requests: Array.from({ length: storedKeys.length }, () => {
      const key = storedKeys[Math.floor(Math.random() * storedKeys.length)];
      const isRead = Math.random() > 0.5; // 50% chance for read, 50% for delete
      return {
        method: isRead ? 'GET' : 'DELETE',
        path: isRead ? `/read/${key}` : `/delete/${key}`
      };
    })
  },
    (err, res) => {
      if (err) {
        console.error("Error running Autocannon:", err);
      } else {
        console.log("Autocannon test finished");
        console.log(res);
      }
    });

  console.log('READ/DELETE Test Complete.');
}

async function runTests() {
  await runPutTest(); // Ensure PUT happens first
  await runReadDeleteTest(); // Then read/delete
}

runTests();
