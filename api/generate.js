export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brandName, marketplace } = req.body;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        messages: [{
          role: 'user',
          content: `Erstelle Amazon Brand Store für "${brandName}" auf Amazon.${marketplace}. Homepage (6-8 Module), 2 Kategorieseiten, Über uns. JSON: {"pages":[{"name":"Homepage","modules":[{"type":"hero","heading":"Text","description":"Text"}]}]}`
        }]
      })
    });

    const data = await response.json();
    
    if (!data.content?.[0]?.text) {
      throw new Error('Keine AI Antwort');
    }

    const text = data.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Kein JSON gefunden');
    }

    const result = JSON.parse(jsonMatch[0]);
    res.status(200).json(result);

  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ error: error.message });
  }
}
