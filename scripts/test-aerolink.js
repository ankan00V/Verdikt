async function testAerolink(modelName) {
  console.log(`Testing model: ${modelName}...`);
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch("https://capi.aerolink.lat/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": "aero_live_Zxd-nboyCojuH393rRXuScP3SehV0Vdhb9PeLXV1s6I",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 10,
        messages: [{ role: "user", content: "Say hi" }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`[${modelName}] HTTP Error ${response.status}: ${error}`);
    } else {
      const data = await response.json();
      console.log(`[${modelName}] Success! Response:`, data.content?.[0]?.text);
    }
  } catch (err) {
    console.log(`[${modelName}] Failed: ${err.message}`);
  }
  
  console.log(`Time taken: ${Date.now() - startTime}ms\n`);
}

async function runTests() {
  await testAerolink("claude-sonnet-5");
  await testAerolink("claude-sonnet-4-6");
  await testAerolink("claude-haiku-4-5-20251001");
  await testAerolink("claude-opus-4-7");
}

runTests();
