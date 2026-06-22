const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://eqpoqksvdmyuqmiogsyk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxcG9xa3N2ZG15dXFtaW9nc3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTkyMzEsImV4cCI6MjA5Njc3NTIzMX0.fxAhX_HtBenZdccygLr09V4UmC1lsHKH34FOyui2mOU";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log("Fetching message table columns...");
  const { data, error } = await supabase
    .from('team_messages')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error querying team_messages:", error);
  } else {
    console.log("Success! Columns in team_messages:", data.length > 0 ? Object.keys(data[0]) : "No rows in table. Fetching columns via REST api check...");
    const { data: cols, error: err2 } = await supabase.rpc('get_table_columns_debug'); // check if helper exists
    console.log("REST response:", cols, err2);
  }
}

checkSchema();
