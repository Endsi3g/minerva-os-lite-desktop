const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://eqpoqksvdmyuqmiogsyk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxcG9xa3N2ZG15dXFtaW9nc3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTkyMzEsImV4cCI6MjA5Njc3NTIzMX0.fxAhX_HtBenZdccygLr09V4UmC1lsHKH34FOyui2mOU";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log("Testing insert into team_messages...");
  const { data, error } = await supabase
    .from('team_messages')
    .insert({
      id: "00000000-0000-0000-0000-000000000000",
      workspace_id: "00000000-0000-0000-0000-000000000000",
      sender_id: "00000000-0000-0000-0000-000000000000",
      sender_name: "Test",
      content: "Hello",
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error("Insert error:", error);
  } else {
    console.log("Insert success:", data);
  }

  console.log("Testing select from team_messages...");
  const { data: selData, error: selError } = await supabase
    .from('team_messages')
    .select('*')
    .limit(1);

  if (selError) {
    console.error("Select error:", selError);
  } else {
    console.log("Select success:", selData);
  }
}

testInsert();
