require('dotenv').config({path: 'backend/.env'});

async function run() {
  const apiKey = process.env.OPENAI_API_KEY;
  const systemContent = "You are an AI sales assistant. CRITICAL INSTRUCTION: You MUST respond ONLY in a valid JSON object.";
  const messages = [
    { role: 'system', content: systemContent },
    { role: 'user', content: 'Hi' }
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: messages,
      response_format: { type: "json_object" },
      max_tokens: 800
    })
  });

  const data = await response.json();
  console.log(data);
}
run();
