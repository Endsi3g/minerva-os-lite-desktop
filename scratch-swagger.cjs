const supabaseUrl = "https://eqpoqksvdmyuqmiogsyk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxcG9xa3N2ZG15dXFtaW9nc3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTkyMzEsImV4cCI6MjA5Njc3NTIzMX0.fxAhX_HtBenZdccygLr09V4UmC1lsHKH34FOyui2mOU";

async function fetchSchema() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    if (!res.ok) {
      console.error("HTTP error:", res.status, res.statusText);
      return;
    }
    const doc = await res.json();
    console.log("Tables found:", Object.keys(doc.definitions || {}));
    if (doc.definitions && doc.definitions.team_messages) {
      console.log("team_messages definition:", JSON.stringify(doc.definitions.team_messages, null, 2));
    } else {
      console.log("team_messages definition not found in schema.");
    }
  } catch (err) {
    console.error(err);
  }
}

fetchSchema();
