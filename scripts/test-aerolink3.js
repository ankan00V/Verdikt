async function testAerolink(modelName) {
  console.log(`Testing model: ${modelName}...`);
  const startTime = Date.now();
  
  try {
    const response = await fetch("https://capi.aerolink.lat/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": "aero_live_Zxd-nboyCojuH393rRXuScP3SehV0Vdhb9PeLXV1s6I",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        "accept-encoding": "identity" // explicitly ask for uncompressed
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 10,
        messages: [{ role: "user", content: "Say hi" }]
      })
    });

    const text = await response.text();
    console.log(`[${modelName}] HTTP Status: ${response.status}`);
    console.log(`[${modelName}] Raw Response:\n${text.substring(0, 300)}`);
    
  } catch (err) {
    console.log(`[${modelName}] Failed: ${err.message}`);
  }
}

testAerolink("claude-sonnet-5");
