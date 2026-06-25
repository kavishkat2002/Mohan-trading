const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: vehicles, error } = await supabase.from('vehicles').select('*');
    if (error) {
        console.error('Error fetching vehicles:', error);
        return;
    }

    for (const v of vehicles) {
        if (v.image_url && v.image_url.endsWith('.avif')) {
            const newUrl = v.image_url.replace('.avif', '.jpg');
            const { error: updateError } = await supabase
                .from('vehicles')
                .update({ image_url: newUrl })
                .eq('id', v.id);
            
            if (updateError) {
                console.error(`Error updating vehicle ${v.id}:`, updateError);
            } else {
                console.log(`Updated vehicle ${v.name} image URL to ${newUrl}`);
            }
        }
    }
    console.log('Update complete.');
}
main();
