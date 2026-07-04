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
    const text = await response.text();
    console.log(`[${modelName}] HTTP Status: ${response.status}`);
    console.log(`[${modelName}] Raw Response (first 200 chars):\n${text.substring(0, 200)}`);
    console.log(`[${modelName}] Headers:`, JSON.stringify([...response.headers.entries()]));
    
  } catch (err) {
    console.log(`[${modelName}] Failed: ${err.message}`);
  }
  
  console.log(`Time taken: ${Date.now() - startTime}ms\n`);
}

testAerolink("claude-sonnet-5");
