import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env manually since we are running this with node, not vite
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Key:', supabaseAnonKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Missing credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('count', { count: 'exact', head: true });

        if (error) {
            console.error('Connection Failed:', error.message);
            if (error.code === '42P01') {
                console.error('Reason: Table "projects" does not exist.');
                console.log('\nPlease run this SQL in your Supabase SQL Editor:');
                console.log(`
create table projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  name text not null,
  client text,
  location text,
  data jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
                `);
            }
        } else {
            console.log('Connection Successful! Table "projects" exists.');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testConnection();
