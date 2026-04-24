
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load env vars from .env.local manually
const env = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => env.split('\n').find(line => line.startsWith(key))?.split('=')[1]?.trim();

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadData() {
  console.log('Reading CSV...');
  const fileContent = fs.readFileSync('dataset.csv', 'utf8');
  const lines = fileContent.split('\n');
  const headers = lines[0].split(',');
  
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',');
    const data = {};
    headers.forEach((header, index) => {
      data[header.trim()] = values[index]?.trim();
    });

    results.push({
      city: data.city,
      area: data.area,
      rooms: parseInt(data.rooms),
      bathroom: parseInt(data.bathroom),
      parking_spaces: parseInt(data.parking_spaces),
      floor: data.floor,
      animal_allowance: data.animal_allowance,
      furniture: data.furniture,
      association_tax: parseInt(data.association_tax) || 0,
      rent_amount: parseInt(data.rent_amount) || 0,
      property_tax: parseInt(data.property_tax) || 0,
      fire_insurance: parseInt(data.fire_insurance) || 0,
      total_rent: parseInt(data.total_rent) || 0
    });
  }

  console.log(`Finished reading ${results.length} rows. Uploading to Supabase...`);
  
  const batchSize = 100;
  for (let i = 0; i < results.length; i += batchSize) {
    const batch = results.slice(i, i + batchSize);
    const { error } = await supabase.from('market_data').insert(batch);
    if (error) {
      console.error(`Error uploading batch starting at ${i}:`, error.message);
      console.log('NOTE: Make sure you have created the "market_data" table in Supabase and enabled public insert policy.');
      return;
    }
    process.stdout.write(`Uploaded ${i + batch.length}/${results.length} rows\r`);
  }
  console.log('\nUpload complete!');
}

uploadData();
