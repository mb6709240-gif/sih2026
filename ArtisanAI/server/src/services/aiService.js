import 'dotenv/config';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Utility to invoke Google Gemini REST API with timeout
 */
async function callGemini(prompt, systemInstruction = '', timeoutMs = 30000) {
  if (!GEMINI_API_KEY) return null;
  try {
    const contents = [];
    if (systemInstruction) {
      contents.push({ role: 'user', parts: [{ text: `System Instruction: ${systemInstruction}\n\nTask: ${prompt}` }] });
    } else {
      contents.push({ role: 'user', parts: [{ text: prompt }] });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1200
        }
      })
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(`Gemini API returned status ${response.status}: ${errText.slice(0, 150)}`);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('Gemini API call timed out after 30s');
    } else {
      console.error('Gemini API call error:', err.message);
    }
    return null;
  }
}

/**
 * Utility to invoke Google Gemini Multimodal Vision API with timeout
 */
async function callGeminiVision(prompt, mimeType, base64Data, timeoutMs = 30000) {
  if (!GEMINI_API_KEY || !base64Data) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType || 'image/jpeg', data: base64Data } }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1200
        }
      })
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.warn(`Gemini Vision API returned status ${response.status}: ${errText.slice(0, 150)}`);
      return null;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('Gemini Vision API timed out after 30s');
    } else {
      console.error('Gemini Vision API error:', err.message);
    }
    return null;
  }
}

const titleCase = s => String(s || '').replace(/\b\w/g, c => c.toUpperCase());

export function aiStatus() {
  return {
    provider: GEMINI_API_KEY ? 'gemini' : 'local-fallback',
    onlineAI: Boolean(GEMINI_API_KEY),
    offlineFallback: true,
    model: GEMINI_API_KEY ? GEMINI_MODEL : 'deterministic-local-rules'
  };
}


/**
 * Catalog Generation from Inputs
 */
export async function catalogFromInput({ name = '', category = 'Handicraft', material = 'Traditional materials', story = '' }) {
  const clean = titleCase(name || 'Handmade Artisan Product');
  
  const prompt = `You are an AI catalog assistant for an artisan e-commerce platform. Generate listing details for a product:
  - Name: ${clean}
  - Category: ${category}
  - Material: ${material}
  - Artisan Story/Notes: ${story}

  Respond strictly in valid JSON format with keys:
  "title": string,
  "category": string,
  "description": string (appealing 3-4 sentence description highlighting craftsmanship, materials, and gifting value),
  "tags": array of 5-8 relevant string tags,
  "care": string (care and maintenance instructions),
  "seo": string (search-engine optimized keywords string)`;

  const aiResult = await callGemini(prompt, 'You are an expert e-commerce catalog writer for rural and traditional artisans.');
  
  if (aiResult) {
    try {
      const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || clean,
          category: parsed.category || category,
          description: parsed.description || `Handcrafted ${clean} created using authentic ${material}.`,
          tags: Array.isArray(parsed.tags) ? parsed.tags : [category.toLowerCase(), 'handmade', 'artisan', 'traditional'],
          care: parsed.care || 'Handle with care. Clean gently with a dry or slightly damp cloth.',
          seo: parsed.seo || `${clean} handmade ${category}`
        };
      }
    } catch (e) {
      console.warn('Failed to parse Gemini catalog JSON, using fallback');
    }
  }

  // Enhanced Fallback Logic
  return {
    title: clean,
    category,
    description: `Discover this beautifully handcrafted ${clean.toLowerCase()}, meticulously made by an artisan using ${material.toLowerCase()}. ${story || 'Each piece represents generations of traditional craftsmanship, bringing authentic heritage into modern homes.'} Perfect for thoughtful gifting, conscious living, and art collectors who value authentic craftsmanship.`,
    tags: [...new Set([category.toLowerCase(), material.toLowerCase(), 'handmade', 'artisan', 'traditional', 'craft', 'gift'])],
    care: `Clean gently with a soft dry cloth. Store in a dry area away from direct moisture to preserve the natural ${material.toLowerCase()} finish.`,
    seo: `${clean} authentic handmade ${category} ${material} artisan craft`
  };
}

/**
 * Fair Price Advisory
 */
export async function priceAdvice({ cost = 250, hours = 4, demand = 'normal', category = 'Handicraft', material = 'Artisan Material' }) {
  const baseCost = Number(cost) || 0;
  const laborHours = Number(hours) || 0;
  const hourlyRate = 60; // Fair wage per hour in INR
  const laborCost = laborHours * hourlyRate;
  const basePrice = baseCost + laborCost;
  
  const demandMultiplier = demand === 'high' ? 1.30 : demand === 'low' ? 1.08 : 1.18;
  const minPrice = Math.round((basePrice * 1.15) / 10) * 10;
  const sugPrice = Math.round((basePrice * demandMultiplier) / 10) * 10;
  const premPrice = Math.round((sugPrice * 1.25) / 10) * 10;

  const prompt = `Explain fair pricing for a handmade ${category} item made of ${material}.
  Material Cost: ₹${baseCost}, Labor Hours: ${laborHours} hrs, Calculated Sug. Price: ₹${sugPrice}.
  Give a brief 2-sentence rationale for the artisan explaining fair margin, labor value, and market competitiveness.`;

  const aiReason = await callGemini(prompt);

  return {
    estimatedCost: basePrice,
    laborCost,
    materialCost: baseCost,
    minimumPrice: minPrice,
    suggestedPrice: sugPrice,
    premiumPrice: premPrice,
    reason: aiReason || `This pricing ensures a fair hourly wage of ₹${hourlyRate}/hr for ${laborHours} hours of skilled craft labor plus material costs (₹${baseCost}), leaving room for a healthy artisan profit margin.`
  };
}

/**
 * AI Marketing Content Generator
 */
export async function marketing(product) {
  const prompt = `Generate marketing posts for an artisan product:
  Product: ${product.name}
  Price: ₹${product.price}
  Category: ${product.category || 'Handicraft'}
  Description: ${product.description || ''}

  Respond strictly in valid JSON format with keys:
  "whatsapp": string (short message with emojis and order link placeholder),
  "instagram": string (engaging caption with relevant hashtags),
  "videoScript": string (3-step reel script: Hook, Story/Crafting, CTA)`

  const aiResult = await callGemini(prompt, 'You are an expert social media strategist for ethical handmade products.');

  if (aiResult) {
    try {
      const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('Failed to parse Gemini marketing JSON');
    }
  }

  // Enhanced Fallback Marketing
  return {
    whatsapp: `✨ *${product.name}*\n🌿 Handcrafted with love by a verified rural artisan.\n💰 Price: ₹${product.price}\n\nSupport direct artisan commerce. Each purchase directly sustains heritage craft communities!\n👉 Order now on ArtisanAI: https://artisanai.com/p/${product.id || ''}`,
    instagram: `Meet the ${product.name} — handcrafted with care, patience, and traditional skill. 🌿✨\n\nPrice: ₹${product.price}\nEvery piece tells a story of heritage and sustainability.\n\nShop directly from the maker on ArtisanAI! 🛍️\n\n#Handmade #ArtisanCraft #EthicalShopping #DirectFromArtisan #${(product.category || 'Handicraft').replace(/\s+/g, '')} #SupportLocalArtisans`,
    videoScript: `🎬 *Reels / Short Video Script*\n\n1. 🎣 **Hook (0-3s):** "Tired of mass-produced plastic items? Look at this!"\n2. 🎨 **Showcase (3-10s):** Show close-ups of ${product.name} made with ${product.material || 'natural materials'}.\n3. 📣 **Call to Action (10-15s):** "Support local Indian craftspeople. Click the link in bio to buy directly from the artisan!"`
  };
}

/**
 * Natural Language Search Intent Parsing
 */
export async function searchIntent(q) {
  const text = String(q || '').trim();
  if (!text) return { query: '', budget: null, category: null, occasion: null, intent: 'Empty query' };

  const prompt = `Extract search intent from customer query: "${text}".
  Respond strictly in valid JSON with keys:
  "budget": number or null (e.g. if query says "under 1000", budget is 1000),
  "category": string or null (e.g. "bamboo", "terracotta", "textile", "jewellery", "wood"),
  "occasion": string or null (e.g. "gift", "wedding", "home decor", "diwali"),
  "intent": string (short summary of what customer wants)`;

  const aiResult = await callGemini(prompt);
  if (aiResult) {
    try {
      const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          query: text,
          budget: typeof parsed.budget === 'number' ? parsed.budget : null,
          category: parsed.category || null,
          occasion: parsed.occasion || null,
          intent: parsed.intent || `Find relevant products matching "${text}"`
        };
      }
    } catch (e) {
      console.warn('Search intent JSON parse failed, using fallback');
    }
  }

  // Fallback Intent Regex
  let budget = null;
  const m = text.toLowerCase().match(/(?:under|below|within|less than|\<)\s*₹?\s*(\d+)/);
  if (m) budget = Number(m[1]);

  const categories = ['bamboo', 'terracotta', 'palm leaf', 'textile', 'wood', 'jewellery', 'pottery', 'brass', 'clay'];
  const category = categories.find(c => text.toLowerCase().includes(c)) || null;

  const occasions = ['gift', 'wedding', 'diwali', 'pongal', 'birthday', 'home decor', 'office'];
  const occasion = occasions.find(o => text.toLowerCase().includes(o)) || null;

  return {
    query: text,
    budget,
    category,
    occasion,
    intent: `Find handcrafted items matching budget: ${budget ? '₹' + budget : 'any'}, category: ${category || 'all'}, occasion: ${occasion || 'any'}`
  };
}

/**
 * Smart Business Insights for Artisans
 */
export async function businessInsight(products = [], orders = []) {
  if (GEMINI_API_KEY && products.length > 0) {
    const summary = products.map(p => `${p.name} (₹${p.price}, ${p.category})`).join(', ');
    const prompt = `Give one actionable, encouraging 2-sentence business tip for a traditional artisan with these products: ${summary}. Focus on seasonal demand, catalog expansion, or fair pricing.`;
    const aiInsight = await callGemini(prompt);
    if (aiInsight) return aiInsight.trim();
  }

  const defaultInsights = [
    "Your bamboo and natural fiber collection is trending! Consider creating a bundled gift pack under ₹1,200 for festive occasions.",
    "Products priced between ₹500–₹1,000 see 40% higher conversion rates. Adding clear care instructions will boost buyer confidence.",
    "Eco-conscious home buyers are actively searching for handmade décor. Highlight natural materials and eco-friendly dyes in your listing descriptions.",
    "Adding a video or 3 high-resolution photos increases artisan order volume by up to 2.5x!"
  ];

  return defaultInsights[new Date().getDay() % defaultInsights.length];
}

/**
 * Intelligent AI Assistant Chatbot
 */
export async function chatReply(message) {
  const text = String(message || '').trim();
  const lower = text.toLowerCase();

  if (!text) {
    return {
      reply: 'Hello! I am your ArtisanAI Assistant. How can I help your shop or search today?',
      intent: 'empty',
      suggestions: ['Find a handmade gift', 'Enhance product photo', 'Open seller dashboard']
    };
  }

  const systemInstruction = `You are ArtisanAI Assistant, a friendly, helpful guide on the ArtisanAI platform.
  ArtisanAI is an AI-powered e-commerce platform linking traditional rural artisans directly with customers and B2B buyers.
  Keep your response concise (2-4 sentences), encouraging, and clear. Suggest relevant actions when appropriate.`;

  const aiReply = await callGemini(`Customer message: "${text}"`, systemInstruction);

  let intent = 'general';
  let suggestions = ['Search the marketplace', 'Enhance product photo', 'Open seller dashboard'];

  if (lower.includes('photo') || lower.includes('background') || lower.includes('image') || lower.includes('camera')) {
    intent = 'photo';
    suggestions = ['Open Photo Studio', 'Remove image background'];
  } else if (lower.includes('sell') || lower.includes('dashboard') || lower.includes('artisan') || lower.includes('list')) {
    intent = 'dashboard';
    suggestions = ['Open seller dashboard', 'Generate catalog with AI'];
  } else if (lower.includes('price') || lower.includes('cost') || lower.includes('margin') || lower.includes('profit')) {
    intent = 'pricing';
    suggestions = ['Open fair pricing calculator', 'Calculate price with AI'];
  } else if (lower.includes('gift') || lower.includes('buy') || lower.includes('find') || lower.includes('search')) {
    intent = 'search';
    suggestions = ['Find gifts under ₹1000', 'Explore bamboo crafts', 'Search home décor'];
  }

  return {
    reply: aiReply || getFallbackChatReply(lower, text),
    intent,
    suggestions
  };
}

function getFallbackChatReply(lower, text) {
  if (/^(hi|hii|hello|hey|namaste)\b/.test(lower)) {
    return 'Namaste! Welcome to ArtisanAI. I can assist you with discovering handmade products, writing AI catalog listings, pricing your crafts fairly, or enhancing product photos.';
  }
  if (lower.includes('photo') || lower.includes('background')) {
    return 'I can remove background clutter from your product photos and place them on a professional studio canvas. Click "Open Photo Studio" to start!';
  }
  if (lower.includes('dashboard') || lower.includes('sell')) {
    return 'Your AI Seller Dashboard provides tools for voice catalog generation, fair price calculation, social marketing generation, and sales tracking.';
  }
  if (lower.includes('price') || lower.includes('cost')) {
    return 'Our Fair Pricing AI calculates prices based on material cost, labor hours (at fair wages), and market demand so you never underprice your craftsmanship.';
  }
  return `I'm here to help with "${text}". You can ask me to find gifts, analyze your product photos, translate craft descriptions, or calculate fair pricing!`;
}

/**
 * Dynamic AI Search Suggestions
 */
export function searchSuggestions(q, products = []) {
  const text = String(q || '').toLowerCase().trim();
  if (!text) return ['handmade gift under ₹1000', 'eco-friendly home décor', 'bamboo craft basket', 'terracotta lamp'];
  
  const matches = products
    .filter(p => [p.name, p.category, p.description, ...p.tags].join(' ').toLowerCase().includes(text))
    .slice(0, 4)
    .map(p => p.name);

  return [...new Set([...matches, `${text} under ₹1000`, `${text} for gifting`, `authentic ${text}`])].slice(0, 5);
}

/**
 * Multimodal Product Image Analysis (Vision API)
 */
export async function analyzeProductImage({ filename = '', buffer = null, mimeType = 'image/jpeg', name = '', category = 'Handicraft', material = 'Traditional materials' } = {}) {
  let base64Data = null;
  if (buffer) {
    base64Data = buffer.toString('base64');
  }

  if (base64Data && GEMINI_API_KEY) {
    const prompt = `Analyze this product image of a handmade artisan item.
    Respond strictly in valid JSON with keys:
    "name": string (suggested product title),
    "category": string (e.g. Bamboo Craft, Terracotta, Textile, Woodwork, Pottery, Jewellery),
    "subcategory": string,
    "material": string (e.g. Bamboo, Clay, Silk, Cotton, Teakwood, Brass),
    "colors": string (color palette observed),
    "craftType": string (e.g. Handwoven, Terracotta molding, Block printing),
    "culturalCharacteristics": string,
    "shortDescription": string (1-sentence summary),
    "detailedDescription": string (2-3 sentence product listing description),
    "tags": array of 5-8 strings,
    "keywords": array of 5 strings`;

    const visionResult = await callGeminiVision(prompt, mimeType, base64Data);

    if (visionResult) {
      try {
        const jsonMatch = visionResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn('Failed to parse Gemini Vision JSON response');
      }
    }
  }

  // Enhanced Heuristic Image Analysis
  const text = `${filename} ${name} ${category} ${material}`.toLowerCase();
  
  if (text.includes('terracotta') || text.includes('clay') || text.includes('pot') || text.includes('lamp')) {
    return {
      name: name || 'Handcrafted Terracotta Decorative Lamp',
      category: 'Terracotta Craft',
      subcategory: 'Home Décor & Lighting',
      material: 'Earthy Terracotta Clay',
      colors: 'Warm terracotta orange, rustic brown, burnt sienna',
      craftType: 'Wheel-thrown & Hand-carved Clay Craft',
      culturalCharacteristics: 'Authentic Indian terracotta pottery with intricate lattice cutouts for warm lighting.',
      shortDescription: 'Exquisite handcrafted terracotta lamp created with natural clay and traditional firing techniques.',
      detailedDescription: 'This handcrafted terracotta piece radiates traditional elegance. Shaped by master potters using natural eco-friendly clay, it brings warm ambient lighting and ethnic charm to any living space.',
      tags: ['terracotta', 'clay', 'handmade', 'homedecor', 'eco-friendly', 'artisan', 'lighting'],
      keywords: ['terracotta clay lamp', 'handmade clay decor', 'eco friendly home decor', 'artisan terracotta', 'indian handicrafts']
    };
  } else if (text.includes('bamboo') || text.includes('cane') || text.includes('basket') || text.includes('weave')) {
    return {
      name: name || 'Handwoven Natural Bamboo Storage Basket',
      category: 'Bamboo Craft',
      subcategory: 'Storage & Home Accessories',
      material: 'Sustainable Natural Bamboo',
      colors: 'Natural golden bamboo, beige, warm wood tones',
      craftType: 'Handwoven Lattice Bamboo Craft',
      culturalCharacteristics: 'Traditional Northeast & South Indian bamboo weaving techniques, 100% biodegradable.',
      shortDescription: 'Durable and lightweight handwoven bamboo basket made from sustainably harvested bamboo strips.',
      detailedDescription: 'Handcrafted by skilled bamboo artisans, this storage basket combines utility with natural rustic aesthetic. Ideal for organizing home items, planter covers, or luxury eco-friendly gift hampers.',
      tags: ['bamboo', 'handwoven', 'eco-friendly', 'storage', 'basket', 'sustainable', 'artisan'],
      keywords: ['bamboo storage basket', 'handwoven bamboo craft', 'sustainable home decor', 'eco friendly basket', 'artisan bamboo']
    };
  }

  return {
    name: name || 'Handcrafted Artisan Product',
    category,
    subcategory: 'Handcrafted Goods',
    material,
    colors: 'Natural artisan finish',
    craftType: 'Traditional Handmade Craft',
    culturalCharacteristics: 'Handcrafted with traditional techniques representing regional artisan heritage.',
    shortDescription: `Beautifully made ${name || 'artisan product'} created using authentic ${material}.`,
    detailedDescription: `This item showcases fine craftsmanship and natural materials. Carefully crafted in small batches, it supports fair wages and preserves traditional heritage skills.`,
    tags: ['handmade', 'artisan', category.toLowerCase(), 'traditional', 'ethical', 'gift'],
    keywords: ['artisan craft', 'handmade product', category.toLowerCase(), 'ethical shopping', 'authentic handmade']
  };
}

/**
 * Multilingual Translation Service
 */
export async function translateText(text, language = 'Tamil') {
  const value = String(text || '').trim();
  if (!value) return '';

  if (language === 'English') return value;

  const prompt = `Translate the following artisan product text into ${language}.
  Keep the tone natural, culturally appropriate, and preserve specific craft terms.
  Text to translate: "${value}"
  Output ONLY the translated text without extra explanation.`;

  const translated = await callGemini(prompt);
  if (translated) return translated.trim();

  // Fallback Translation formatting
  const translations = {
    Tamil: `${value} (தமிழ்)`,
    Hindi: `${value} (हिंदी)`,
    Kannada: `${value} (கன்னட / ಕನ್ನಡ)`,
    Telugu: `${value} (తెలుగు)`,
    Malayalam: `${value} (മലയാളം)`,
    Marathi: `${value} (मराठी)`,
    Bengali: `${value} (বাংলা)`
  };

  return translations[language] || `${value} (${language})`;
}

/**
 * AI Customer Shopping Assistant
 * Helps buyers find the perfect gift, artisanal home decor, or custom craft
 */
export async function customerAssistant({ query = '', preferences = {}, products = [] }) {
  const q = String(query || '').trim();
  const lower = q.toLowerCase();

  // Find matching products
  let matched = [];
  if (products.length > 0) {
    matched = products.filter(p => {
      const text = `${p.name} ${p.category} ${p.description} ${p.material || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
      return text.includes(lower) || (preferences.category && text.includes(preferences.category.toLowerCase()));
    });
    if (matched.length === 0) {
      matched = products.slice(0, 3);
    }
  }

  const prompt = `You are a personalized shopping advisor for an Indian handmade craft marketplace called ArtisanAI.
  Customer Query: "${q}"
  Available Matching Products: ${matched.map(p => `${p.name} (₹${p.price}, ${p.category}, Material: ${p.material || 'Natural'})`).join('; ')}
  
  Provide a warm, personalized recommendation in 2-3 sentences. Mention why these handmade items make meaningful gifts or home additions, and highlight the heritage/sustainability angle.`;

  const aiRecommendation = await callGemini(prompt, 'You are an ethical luxury craft curator and personal shopping assistant.');

  const fallbackRecommendations = [
    `Based on your search for "${q || 'handcrafted goods'}", I recommend our authentic artisanal pieces. Each item is made using sustainable techniques that empower rural maker communities!`,
    `Looking for something unique? Our handcrafted ${matched[0]?.category || 'artisan'} collection offers authentic heritage styling with sustainable materials.`,
    `Handcrafted gifts create lasting memories. These pieces by verified artisans bring authentic warmth and cultural charm to any space.`
  ];

  return {
    recommendation: aiRecommendation || fallbackRecommendations[Math.floor(Math.random() * fallbackRecommendations.length)],
    products: matched.slice(0, 4),
    tips: [
      'Every purchase directly supports rural artisan families with fair living wages',
      'All items use natural, eco-friendly materials and traditional dyes',
      'Custom artisan engraving & gift wrapping available on select items'
    ]
  };
}

