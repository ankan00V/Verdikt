const { ChatAnthropic } = require("@langchain/anthropic");

async function test() {
  const llm = new ChatAnthropic({
    modelName: "claude-sonnet-5",
    anthropicApiKey: "aero_live_Zxd-nboyCojuH393rRXuScP3SehV0Vdhb9PeLXV1s6I",
    clientOptions: {
      baseURL: "https://capi.aerolink.lat/"
    }
  });

  console.log("Invoking Anthropic with claude-sonnet-5...");
  const start = Date.now();
  try {
    const res = await llm.invoke("Say hi in one word");
    console.log("Result:", res.content);
  } catch (e) {
    console.error("Error:", e.message);
  }
  console.log("Time:", Date.now() - start, "ms");
}
test();
