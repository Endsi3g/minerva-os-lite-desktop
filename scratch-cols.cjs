const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://eqpoqksvdmyuqmiogsyk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxcG9xa3N2ZG15dXFtaW9nc3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExOTkyMzEsImV4cCI6MjA5Njc3NTIzMX0.fxAhX_HtBenZdccygLr09V4UmC1lsHKH34FOyui2mOU";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCols() {
  const possibleCols = [
    'id',
    'workspace_owner_id',
    'sender_id',
    'sender_name',
    'content',
    'created_at',
    'updated_at',
    'workspace_id'
  ];

  for (const col of possibleCols) {
    const { data, error } = await supabase
      .from('team_messages')
      .select(col)
      .limit(1);

    if (error) {
      console.log(`Column '${col}': ERROR:`, error.message);
    } else {
      console.log(`Column '${col}': EXISTS`);
    }
  }
}

testCols();
