console.log("Checking process.env keys...");
const keys = Object.keys(process.env).filter(k => k.toLowerCase().includes("supabase") || k.toLowerCase().includes("service") || k.toLowerCase().includes("postgres"));
console.log("Matching env keys:", keys);
for (const k of keys) {
  // Print key and length of value
  console.log(`- ${k}: length=${process.env[k] ? process.env[k].length : 0}`);
}
