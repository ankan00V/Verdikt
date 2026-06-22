import fs from "fs";
import path from "path";

export function loadFixture(name: string) {
  try {
    const fixturePath = path.join(process.cwd(), "src", "lib", "agent", "__fixtures__", `${name}.json`);
    if (fs.existsSync(fixturePath)) {
      console.log(`[Fixture] Loaded mock data for ${name}`);
      return JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
    }
  } catch (error) {
    console.error(`[Fixture] Error loading fixture ${name}:`, error);
  }
  return null;
}

export function saveFixture(name: string, data: any) {
  try {
    const dir = path.join(process.cwd(), "src", "lib", "agent", "__fixtures__");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const fixturePath = path.join(dir, `${name}.json`);
    fs.writeFileSync(fixturePath, JSON.stringify(data, null, 2), "utf-8");
    console.log(`[Fixture] Saved mock data to ${name}.json`);
  } catch (error) {
    console.error(`[Fixture] Error saving fixture ${name}:`, error);
  }
}
