const { getAuthToken } = require('@heyputer/puter.js/src/init.cjs');

async function main() {
  console.log("=========================================");
  console.log("Opening browser to authenticate with Puter...");
  console.log("Please click 'Authorize' in the browser window.");
  console.log("=========================================\n");
  
  try {
    const token = await getAuthToken();
    console.log("\n✅ SUCCESS! Here is your PUTER_TOKEN:\n");
    console.log(token);
    console.log("\n👉 Copy the above token and add it to your .env.local file as:");
    console.log(`PUTER_TOKEN="${token}"`);
    console.log("\nThen restart your dev server!");
  } catch (err) {
    console.error("Failed to get token:", err.message);
  }
  process.exit(0);
}
main();
