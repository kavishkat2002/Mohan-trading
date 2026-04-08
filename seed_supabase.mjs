import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    try {
        console.log("Deleting old leads...");
        await supabase.from('leads').delete().neq('id', 0); // Need where condition to delete all

        console.log("Inserting new leads...");
        const { data: newLeads, error: leadsError } = await supabase.from('leads').insert([
            { name: 'Kamal Perera', phone: '0771234567', interested_car: 'Toyota Aqua', status: 'Sale Completed'},
            { name: 'Nuwan De Silva', phone: '0719876543', interested_car: 'Honda Vezel', status: 'Contacted'},
            { name: 'Samira Rathnayake', phone: '0754433221', interested_car: 'Suzuki WagonR', status: 'New'},
            { name: 'Mohammed Zain', phone: '0765544332', interested_car: 'Mitsubishi Montero', status: 'Hot'},
            { name: 'Piumi Hansika', phone: '0781122334', interested_car: 'Toyota Premio', status: 'Warm'},
        ]).select();

        if (leadsError) throw leadsError;

        console.log("Inserted Leads:", newLeads);

        const l1 = newLeads.find(l => l.name === 'Kamal Perera').id;
        const l2 = newLeads.find(l => l.name === 'Nuwan De Silva').id;
        const l3 = newLeads.find(l => l.name === 'Samira Rathnayake').id;
        const l4 = newLeads.find(l => l.name === 'Mohammed Zain').id;
        const l5 = newLeads.find(l => l.name === 'Piumi Hansika').id;

        console.log("Inserting new messages...");
        const msgs = [
            // Kamal
            { lead_id: l1, sender: 'customer', content: 'Hi, I saw the Toyota Aqua 2018 ad on Facebook. Is it still available?', created_at: new Date(Date.now() - 15*24*60*60*1000).toISOString() },
            { lead_id: l1, sender: 'bot', content: 'Hello! Thanks for reaching out to Mohan Trading. Yes, the Toyota Aqua 2018 is currently available.', created_at: new Date(Date.now() - 14.5*24*60*60*1000).toISOString() },
            { lead_id: l1, sender: 'sales', content: 'Hi Kamal, the hybrid battery was replaced 6 months ago. Would you like to schedule a test drive?', created_at: new Date(Date.now() - 14*24*60*60*1000).toISOString() },
            { lead_id: l1, sender: 'customer', content: 'Yes, I can come tomorrow morning.', created_at: new Date(Date.now() - 13.9*24*60*60*1000).toISOString() },

            // Nuwan
            { lead_id: l2, sender: 'customer', content: 'Good evening, looking for details on the Vezel Z-Sense.', created_at: new Date(Date.now() - 10*24*60*60*1000).toISOString() },
            { lead_id: l2, sender: 'bot', content: 'We have a Honda Vezel 2019 (Z-Sense) in stock priced at LKR 9.2M.', created_at: new Date(Date.now() - 9.9*24*60*60*1000).toISOString() },
            { lead_id: l2, sender: 'sales', content: 'We work with HNB, Commercial Bank, and LB Finance. Up to 70% leasing can be arranged.', created_at: new Date(Date.now() - 9.8*24*60*60*1000).toISOString() },
            { lead_id: l2, sender: 'customer', content: 'Ok I will drop by today after work. Can I get a location?', created_at: new Date(Date.now() - 9.5*24*60*60*1000).toISOString() },

            // Samira
            { lead_id: l3, sender: 'customer', content: 'Does the WagonR have push start?', created_at: new Date(Date.now() - 5*24*60*60*1000).toISOString() },
            { lead_id: l3, sender: 'bot', content: 'Our Suzuki WagonR 2020 (FZ) features Push Start. Can I help you with anything else?', created_at: new Date(Date.now() - 4.9*24*60*60*1000).toISOString() },
            { lead_id: l3, sender: 'customer', content: 'What is the last price? Can we do 5M?', created_at: new Date(Date.now() - 4.8*24*60*60*1000).toISOString() },
            { lead_id: l3, sender: 'sales', content: 'Hi Samira, lowest is 5.1M.', created_at: new Date(Date.now() - 4*24*60*60*1000).toISOString() },

            // Zain
            { lead_id: l4, sender: 'customer', content: 'Assalamu alaikum. What is the mileage on the Montero?', created_at: new Date(Date.now() - 2*24*60*60*1000).toISOString() },
            { lead_id: l4, sender: 'bot', content: 'Walaikum salam. The Mitsubishi Montero 2015 has 110,000 KM.', created_at: new Date(Date.now() - 1.9*24*60*60*1000).toISOString() },
            { lead_id: l4, sender: 'sales', content: '[Image file sent]\nHere you go, Zain. It has fully electric leather seats.', created_at: new Date(Date.now() - 1.5*24*60*60*1000).toISOString() },
            { lead_id: l4, sender: 'customer', content: 'Very clean. Let us negotiate tomorrow.', created_at: new Date(Date.now() - 1*24*60*60*1000).toISOString() },

            // Piumi
            { lead_id: l5, sender: 'customer', content: 'Hi, do you have any Toyota Premios or Allions?', created_at: new Date(Date.now() - 3600000).toISOString() },
            { lead_id: l5, sender: 'bot', content: 'Hello! Yes, we have a Toyota Premio 2019 (F-EX) currently available.', created_at: new Date(Date.now() - 3000000).toISOString() },
            { lead_id: l5, sender: 'sales', content: 'Are you looking to upgrade your current vehicle?', created_at: new Date(Date.now() - 2500000).toISOString() },
            { lead_id: l5, sender: 'customer', content: 'Yes, I am selling my Vitz.', created_at: new Date(Date.now() - 1500000).toISOString() },
        ];

        const { error: msgErr } = await supabase.from('messages').insert(msgs);
        if(msgErr) throw msgErr;

        console.log("Successfully seeded Supabase!");
    } catch (e) {
        console.error("Error:", e);
    }
}
seed();
