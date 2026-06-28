import { config } from "dotenv";
config({ path: ".env.local" });

import { NextRequest } from "next/server";

async function runTests() {
  const { POST } = await import("./src/app/api/research/route");
  console.log("=== Testing Rate Limiter ===");
  let rateLimited = false;

  for (let i = 1; i <= 6; i++) {
    const req = new NextRequest("http://localhost:3000/api/research", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "192.168.1.100", // Fixed IP to trigger limit
      },
      body: JSON.stringify({ company: "TestCorp" }),
    });

    const res = await POST(req);
    console.log(`Request ${i}: HTTP ${res.status}`);

    if (res.status === 429) {
      rateLimited = true;
      const data = await res.json();
      console.log(`Rate Limited Response:`, data);
      break;
    }

    if (res.body) {
      res.body.cancel();
    }
  }

  if (rateLimited) {
    console.log("✅ Rate limiter successfully blocked the 6th request.");
  } else {
    console.log("❌ Rate limiter failed to block after 5 requests.");
  }
}

runTests().catch(console.error);
