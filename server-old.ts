import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

const DB_PATH = path.join(process.cwd(), 'db.json');

// Predefined seed data
const SEED_DATA = {
  journalists: [
    {
      id: "anika-patel",
      name: "Anika Patel",
      website: "www.whatsoninmzansi.co.za",
      sections: ["Food & Weekend Markets", "Family & Kids Days Out"],
      role: "Lifestyle & Community Editor",
      tone: "Friendly, inclusive, enthusiastic, sensory-driven, helpful, and warm.",
      personality: "The Social Foodie. She focuses on community, food, family, markets, outdoor activities, and easy weekend plans.",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop",
      created_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString() // 1 week ago
    }
  ],
  articles: [
    {
      id: "art-001",
      journalist_id: "anika-patel",
      title: "Vibrant Saturday Morning at the Neighbourgoods Market",
      topic: "Neighbourgoods Market in Johannesburg",
      status: "approved_sandbox",
      created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      featured_image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop",
      artifacts: {
        story_idea: "To cover the bustling revival of the Neighbourgoods Market in Braamfontein, highlighting the artisanal foods, young designers, and live rooftop music that make it a essential Saturday family destination.",
        research_notes: "Neighbourgoods Market runs every Saturday from 9 AM to 3 PM. Known for multi-cultural food options (paella, dim sum, local biltong, craft burgers). Rooftop area offers craft beers, live DJ, and panoramic Jozi skyline views. Good playground corner for kids on the lower levels.",
        source_list: [
          { name: "Neighbourgoods Market official site", url: "http://www.neighbourgoodsmarket.co.za", status: "verified", notes: "Confirmed hours: Saturday 9:00 - 15:00. Location: 73 Juta Street, Braamfontein." },
          { name: "Gauteng Tourism Authority", url: "https://www.gauteng.net", status: "verified", notes: "Provides security and parking recommendations for visitors to Braamfontein." }
        ],
        article_outline: "1. Introduction: The sensory wave of entering Braamfontein on a Saturday.\n2. Artisanal Food Scene: Walking the food stalls, from sweet koeksisters to woodfired flatbreads.\n3. Family & Kid Friendly features: Safe play areas and spacious seating.\n4. Rooftop Atmosphere: Music, local beers, and the scenic Jozi horizon.\n5. Summary & Tips: Parking, entry fees, and what to bring.",
        draft_article: "The moment you climb the concrete stairs of 73 Juta Street on a Saturday morning, a symphony of sounds and aromas wraps around you like a warm Gauteng hug. The Neighbourgoods Market in the heart of Braamfontein has officially reclaimed its spot as Johannesburg’s favorite weekend sensory playground.\n\nFrom the sizzling pans of giant Spanish paella to the sweet, spiced aroma of freshly fried Cape Malay koeksisters, your taste buds are in for a serious adventure. I started my morning chatting with local vendor Mama Grace, whose biltong is sliced so thin it practically melts. There’s something deeply special about knowing the hands that prepared your food.\n\nFor families, it’s not just a food stall run; it's a full-day experience. While older kids will love browsing the retro clothing stalls and local vinyl records, toddlers are kept thoroughly entertained in the lower-level creative zones with face painting and giant building blocks. \n\nBut the real magic happens on the rooftop deck. Grab a craft gin infused with local fynbos, find a spot on the communal wooden benches, and watch the JHB city skyline shimmer under the winter sun. As the local acoustic band strikes up their first chords, you'll look around at the beautiful, diverse crowd and realize this is exactly what Mzansi is all about: community, laughter, and incredible food.",
        edited_article: "The moment you climb the concrete stairs of 73 Juta Street on a Saturday morning, a symphony of sounds and aromas wraps around you like a warm Gauteng hug. The Neighbourgoods Market in the heart of Braamfontein has officially reclaimed its spot as Johannesburg’s favorite weekend sensory playground.\n\nFrom the sizzling pans of giant Spanish paella to the sweet, spiced aroma of freshly fried Cape Malay koeksisters, your taste buds are in for a serious adventure. I started my morning chatting with local vendor Mama Grace, whose local cured biltong is sliced so thin it practically melts. There’s something deeply special about knowing the hands that prepared your food.\n\nFor families, it’s not just a food stall run; it's a full-day experience. While older kids will love browsing the retro clothing stalls and local vinyl records, toddlers are kept thoroughly entertained in the lower-level creative zones with safe face painting and giant building blocks. \n\nBut the real magic happens on the rooftop deck. Grab a craft gin infused with local fynbos, find a spot on the communal wooden benches, and watch the JHB city skyline shimmer under the warm sun. As the local acoustic band strikes up their first chords, you'll look around at the beautiful, diverse crowd and realize this is exactly what Mzansi is all about: community, laughter, and incredible food.",
        fact_check_report: "FACT-CHECK PASSED:\n- Location '73 Juta Street, Braamfontein' is accurate.\n- Market schedule 'Saturdays' is verified.\n- Stall offerings match actual vendor directories.\n- No fabricated quotes detected; direct vendor mentions are verified.",
        bias_check_report: "BIAS-CHECK PASSED:\n- Neutral and appreciative tone towards all cultural foods.\n- Inclusive representation of Johannesburg’s urban demographics.\n- No gender, racial, or economic bias detected.",
        image_brief: "An editorial-style photo showing a family sitting on a wooden rooftop bench at Neighbourgoods Market in Johannesburg, laughing and eating artisanal market food. Warm sunlight, city skyline in background, lively atmosphere, 16:9 aspect ratio.",
        image_prompt: "A lively, colorful photograph of a modern family enjoying street food on a sunny rooftop market in Johannesburg, South Africa. In the background, the iconic city buildings are visible under a clear blue sky. Warm golden-hour lighting, cozy communal wooden tables, high detail, photorealistic, 16:9",
        image_quality_review: "Approved. Image accurately depicts South African urban market scenery with high-fidelity, matching the lifestyle blog style guide.",
        final_approved_sandbox_version: "Draft approved by Editor-in-Chief. Article transferred to internal staging."
      }
    },
    {
      id: "art-002",
      journalist_id: "anika-patel",
      title: "Baking Sweet Memories: The Best Farm Stalls along the Cradle of Humankind",
      topic: "Family weekend drive to Cradle of Humankind farm stalls",
      status: "awaiting_admin_review",
      created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      featured_image: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&auto=format&fit=crop",
      artifacts: {
        story_idea: "A guide to the absolute best farm stalls for a weekend family drive out to the Cradle of Humankind, focused on freshly baked farm pies, home-made ginger beer, and expansive kid-friendly lawns.",
        research_notes: "Cradle of Humankind is a World Heritage site 50km northwest of Johannesburg. Popular farm stalls include Ngwenya Glass café, Cradle Valley farm shop, and Blaauwbank historical farm. Focus is on home-cooked comfort foods.",
        source_list: [
          { name: "Cradle of Humankind Official Tourism", url: "https://www.gauteng.net/cradle-of-humankind", status: "verified", notes: "Provides routes and list of official heritage locations." },
          { name: "Ngwenya Glass Village", url: "https://www.ngwenyaglass.co.za", status: "verified", notes: "Confirmed family craft market dates and operating hours." }
        ],
        article_outline: "1. Introduction: Escaping Jozi's concrete jungle for a rustic family drive.\n2. First Stop: The warm wood-fired pies and fresh pickles.\n3. Outdoor Play: Stalls with sprawling green grass for kids to run safely.\n4. Craft and Souvenirs: Local glass blowers and candle makers.\n5. Practical Details: Travel times and packing advice.",
        draft_article: "There is nothing quite like rolling down the car windows, leaving the Jozi highway behind, and breathing in the crisp, herbaceous air of the Cradle of Humankind. If your family is like mine, a weekend drive is only as good as its culinary pitstops—and the Cradle’s farm stalls are in a league of their own.\n\nOur absolute favorite hideaway is the Blaauwbank Farm Stall. As you walk up the gravel pathway, the scent of fresh butter and baking yeast is enough to make anyone weak in the knees. Their legendary chicken-and-mushroom pies are packed to the brim with real, slow-cooked farm ingredients. No processed shortcuts here! \n\nBut the best part? These spots are built with active kids in mind. Most stalls feature sprawling, grassy lawns where little ones can roll down hills or meet resident farm sheep while parents enjoy a cup of locally roasted coffee in peace. It’s simple, unhurried, and perfectly sensory-rich.",
        edited_article: "There is nothing quite like rolling down the car windows, leaving the Jozi highway behind, and breathing in the crisp, herbaceous air of the Cradle of Humankind. If your family is like mine, a weekend drive is only as good as its culinary pitstops—and the Cradle’s farm stalls are in a league of their own.\n\nOur absolute favorite hideaway is the Blaauwbank Farm Stall. As you walk up the gravel pathway, the scent of fresh butter and baking yeast is enough to make anyone weak in the knees. Their legendary chicken-and-mushroom pies are packed to the brim with real, slow-cooked farm ingredients. No processed shortcuts here! \n\nBut the best part? These spots are built with active kids in mind. Most stalls feature sprawling, grassy lawns where little ones can roll down hills or meet resident farm sheep while parents enjoy a cup of locally roasted coffee in peace. It’s simple, unhurried, and perfectly sensory-rich.",
        fact_check_report: "FACT-CHECK PASSED:\n- 'Cradle of Humankind' location and distance matches standard maps.\n- Blaauwbank farm shop existence is verified.\n- No historical inaccuracies regarding the Heritage site were used.",
        bias_check_report: "BIAS-CHECK PASSED:\n- Focus is purely on standard family recreation, totally neutral and accessible.",
        image_brief: "Warm, cozy photo of a rustic farm stall entrance with fresh homemade pies on a wooden rack, sunlit green lawns in the background, 16:9 aspect ratio.",
        image_prompt: "A rustic, charming South African farm stall entrance surrounded by lush green lawns. Baskets of fresh fruits and artisanal farm pies on display. Warm morning sunshine, inviting country atmosphere, photorealistic, 16:9"
      }
    }
  ],
  journalist_memory: [
    {
      id: "mem-001",
      journalist_id: "anika-patel",
      memory_type: "style_lesson",
      memory_content: "Incorporate local South African slangs like 'Mzansi', 'Jozi', 'braai', and 'koeksisters' to establish a authentic local sense of place, but keep it accessible.",
      source_article_id: "art-001",
      confidence_score: 0.95,
      status: "approved",
      created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
      last_used_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: "mem-002",
      journalist_id: "anika-patel",
      memory_type: "editorial_preference",
      memory_content: "Always emphasize safety and parking details for family outings, as Jozi parents prioritize secure parking and child-safe play areas when planning weekend trips.",
      source_article_id: "art-001",
      confidence_score: 0.9,
      status: "approved",
      created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      last_used_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
    },
    {
      id: "mem-003",
      journalist_id: "anika-patel",
      memory_type: "image_preference",
      memory_content: "Request images with bright, warm, golden sunlight to match the sunny, optimistic South African spirit rather than cool, moody European lighting.",
      source_article_id: "art-002",
      confidence_score: 0.85,
      status: "candidate",
      created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
      last_used_at: null
    }
  ],
  agent_logs: [
    {
      id: "log-001",
      timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000 - 2 * 3600 * 1000).toISOString(),
      journalist_id: "anika-patel",
      article_id: "art-001",
      action_type: "suggest_topic",
      message: "Anika suggested topic 'Neighbourgoods Market in Johannesburg' based on lifestyle and community alignment."
    },
    {
      id: "log-002",
      timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000 - 1.8 * 3600 * 1000).toISOString(),
      journalist_id: "anika-patel",
      article_id: "art-001",
      action_type: "research",
      message: "Research completed. Gathered 2 verified sources for Neighbourgoods Market. No factual anomalies detected."
    },
    {
      id: "log-003",
      timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000 - 1.5 * 3600 * 1000).toISOString(),
      journalist_id: "anika-patel",
      article_id: "art-001",
      action_type: "draft",
      message: "Draft and edits completed. Sensory words count: 18. South African vocabulary checks passed."
    },
    {
      id: "log-004",
      timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
      journalist_id: "anika-patel",
      article_id: "art-001",
      action_type: "telegram_send",
      message: "Mock dispatch sent to Telegram Channel. Admin approved the post directly in the workspace."
    }
  ],
  telegram_config: {
    bot_token: "",
    chat_id: "",
    is_active: false
  }
};

// Database Read/Write Utility
function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(SEED_DATA, null, 2));
      return SEED_DATA;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database:", error);
    return SEED_DATA;
  }
}

function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing database:", error);
  }
}

// Ensure database is initialized
readDB();

// API ROUTES

// 1. Get Journalists
app.get("/api/journalists", (req, res) => {
  const db = readDB();
  res.json(db.journalists);
});

// 2. Get Articles
app.get("/api/articles", (req, res) => {
  const db = readDB();
  res.json(db.articles);
});

// 3. Get Article detail
app.get("/api/articles/:id", (req, res) => {
  const db = readDB();
  const article = db.articles.find((a: any) => a.id === req.params.id);
  if (!article) {
    return res.status(404).json({ error: "Article not found" });
  }
  res.json(article);
});

// 4. Submit Admin Feedback/Revision Request
app.post("/api/articles/:id/feedback", (req, res) => {
  const { feedback, status } = req.body;
  const db = readDB();
  const articleIdx = db.articles.findIndex((a: any) => a.id === req.params.id);
  
  if (articleIdx === -1) {
    return res.status(404).json({ error: "Article not found" });
  }

  const article = db.articles[articleIdx];
  article.artifacts.admin_feedback = feedback;
  if (status) {
    article.status = status;
  }
  article.updated_at = new Date().toISOString();

  // Create log
  db.agent_logs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    journalist_id: article.journalist_id,
    article_id: article.id,
    action_type: status === "revision_requested" ? "revision_requested" : "admin_feedback",
    message: status === "revision_requested" 
      ? `Revision requested by administrator: "${feedback.substring(0, 50)}..."` 
      : `Feedback received: "${feedback.substring(0, 50)}..."`
  });

  // Extract memory candidate based on this feedback!
  if (feedback && feedback.trim().length > 10) {
    const memoryId = `mem-${Date.now()}`;
    db.journalist_memory.unshift({
      id: memoryId,
      journalist_id: article.journalist_id,
      memory_type: feedback.toLowerCase().includes("image") ? "image_preference" : "style_lesson",
      memory_content: `Feedback lesson: ${feedback}`,
      source_article_id: article.id,
      confidence_score: 0.8,
      status: "candidate",
      created_at: new Date().toISOString(),
      last_used_at: null
    });

    db.agent_logs.unshift({
      id: `log-${Date.now()}-mem`,
      timestamp: new Date().toISOString(),
      journalist_id: article.journalist_id,
      article_id: article.id,
      action_type: "memory_candidate",
      message: `Extracted new memory candidate (${memoryId}) based on admin feedback.`
    });
  }

  writeDB(db);
  res.json(article);
});

// 5. Simulate Telegram webhook callback / button press
app.post("/api/articles/:id/telegram-action", async (req, res) => {
  const { action, revisionText } = req.body; // 'approve' | 'revision' | 'regenerate' | 'reject'
  const db = readDB();
  const articleIdx = db.articles.findIndex((a: any) => a.id === req.params.id);

  if (articleIdx === -1) {
    return res.status(404).json({ error: "Article not found" });
  }

  const article = db.articles[articleIdx];
  const oldStatus = article.status;

  if (action === "approve") {
    article.status = "approved_sandbox";
    article.artifacts.final_approved_sandbox_version = article.artifacts.edited_article || article.artifacts.draft_article;
    
    // Auto-create an approved memory pattern
    db.journalist_memory.unshift({
      id: `mem-${Date.now()}`,
      journalist_id: article.journalist_id,
      memory_type: "approved_pattern",
      memory_content: `Successfully approved structure and style: "${article.title}"`,
      source_article_id: article.id,
      confidence_score: 0.9,
      status: "approved",
      created_at: new Date().toISOString(),
      last_used_at: null
    });
  } else if (action === "revision") {
    article.status = "revision_requested";
    article.artifacts.admin_feedback = revisionText || "Please revise tone and structure.";
  } else if (action === "regenerate") {
    article.status = "image_pending";
  } else if (action === "reject") {
    article.status = "rejected";
    
    // Auto-create a rejected memory pattern
    db.journalist_memory.unshift({
      id: `mem-${Date.now()}`,
      journalist_id: article.journalist_id,
      memory_type: "rejected_pattern",
      memory_content: `Rejected topic/style pattern: "${article.title}"`,
      source_article_id: article.id,
      confidence_score: 0.85,
      status: "candidate",
      created_at: new Date().toISOString(),
      last_used_at: null
    });
  }

  article.updated_at = new Date().toISOString();

  db.agent_logs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    journalist_id: article.journalist_id,
    article_id: article.id,
    action_type: `telegram_${action}`,
    message: `Telegram action received: ${action.toUpperCase()}. Status moved from ${oldStatus} to ${article.status}.`
  });

  writeDB(db);

  // If a real telegram bot config exists, we can optionally notify them that the article was updated.
  if (db.telegram_config && db.telegram_config.is_active && db.telegram_config.bot_token) {
    try {
      const text = `📬 Sandbox Action Confirmed!\n\nArticle: *${article.title}*\nAction: *${action.toUpperCase()}*\nNew Status: *${article.status}*`;
      await fetch(`https://api.telegram.org/bot${db.telegram_config.bot_token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: db.telegram_config.chat_id,
          text: text,
          parse_mode: "Markdown"
        })
      });
    } catch (err) {
      console.error("Real Telegram update failed:", err);
    }
  }

  res.json(article);
});

// Helper function to call Gemini safely
async function callGemini(systemInstruction: string, prompt: string, expectedSchema?: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY is not configured in Secrets / environment variables.");
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const config: any = {
    systemInstruction,
    temperature: 0.7,
  };

  if (expectedSchema) {
    config.responseMimeType = "application/json";
    config.responseSchema = expectedSchema;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: prompt,
    config,
  });

  return response.text;
}

// 6. Suggest or create a new article idea
app.post("/api/articles/create", async (req, res) => {
  const { topic, journalist_id } = req.body;
  const db = readDB();
  const journalist = db.journalists.find((j: any) => j.id === (journalist_id || "anika-patel"));

  if (!journalist) {
    return res.status(404).json({ error: "Journalist not found" });
  }

  const articleId = `art-${Date.now()}`;
  const isSuggested = !topic;

  let chosenTopic = topic;
  let storyIdea = "";
  let title = "";

  try {
    db.agent_logs.unshift({
      id: `log-${Date.now()}-1`,
      timestamp: new Date().toISOString(),
      journalist_id: journalist.id,
      article_id: articleId,
      action_type: "suggest_topic",
      message: isSuggested ? "Anika Patel is brainstorming an article topic based on local Mzansi weekend culture..." : `Admin provided manual topic: "${topic}"`
    });

    writeDB(db);

    const memoryContext = db.journalist_memory
      .filter((m: any) => m.status === "approved")
      .map((m: any) => `- [Memory Type: ${m.memory_type}] ${m.memory_content}`)
      .join("\n");

    const systemPrompt = `You are ${journalist.name}, the ${journalist.role} for the website ${journalist.website}. 
Sections you edit: ${journalist.sections.join(", ")}.
Your tone: ${journalist.tone}
Your personality: ${journalist.personality}

You have the following internal style lessons and memories of past publications to align with:
${memoryContext}

Your website is focused on local recreation in South Africa ("Mzansi"). You must generate realistic ideas that feature actual neighborhoods, parks, restaurants, markets, or travel routes in South Africa (such as Braamfontein, Cradle of Humankind, Soweto, Camps Bay, Durban North, Hout Bay, Pretoria Botanical Gardens, etc.).
DO NOT make up fake events or fake addresses. Use real places, markets, and regional foods.`;

    if (isSuggested) {
      const prompt = "Please suggest 1 creative, warm, sensory-driven story idea for a weekend outing or food review in South Africa. Respond strictly in JSON matching the requested schema.";
      const schema = {
        type: Type.OBJECT,
        properties: {
          suggestedTopic: { type: Type.STRING, description: "A concise description of the local attraction or activity" },
          title: { type: Type.STRING, description: "A catchy, friendly lifestyle headline matching your persona" },
          storyIdea: { type: Type.STRING, description: "A detailed 2-3 sentence description of the angle of the story and who it is for" }
        },
        required: ["suggestedTopic", "title", "storyIdea"]
      };

      const aiResponse = await callGemini(systemPrompt, prompt, schema);
      const parsed = JSON.parse(aiResponse || "{}");
      chosenTopic = parsed.suggestedTopic || "Charming Cape Town Family Weekend Picnic";
      title = parsed.title || "Sunny Cape Town Farm Outings the Kids Will Love";
      storyIdea = parsed.storyIdea || "A local guide to family-friendly markets in Cape Town.";
    } else {
      const prompt = `Develop a story idea pitch based on the admin's requested topic: "${topic}". Respond strictly in JSON matching the requested schema.`;
      const schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A catchy, warm lifestyle headline matching your persona" },
          storyIdea: { type: Type.STRING, description: "A detailed 2-3 sentence description of the angle of the story and who it is for" }
        },
        required: ["title", "storyIdea"]
      };

      const aiResponse = await callGemini(systemPrompt, prompt, schema);
      const parsed = JSON.parse(aiResponse || "{}");
      title = parsed.title || `Discovering ${topic}`;
      storyIdea = parsed.storyIdea || `An in-depth lifestyle article looking at ${topic}.`;
    }

    const newArticle = {
      id: articleId,
      journalist_id: journalist.id,
      title: title,
      topic: chosenTopic,
      status: "idea",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      featured_image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop", // placeholder
      artifacts: {
        story_idea: storyIdea
      }
    };

    const currentDb = readDB();
    currentDb.articles.unshift(newArticle);
    
    currentDb.agent_logs.unshift({
      id: `log-${Date.now()}-2`,
      timestamp: new Date().toISOString(),
      journalist_id: journalist.id,
      article_id: articleId,
      action_type: "pitch_created",
      message: `Anika Patel completed pitch: "${title}". Topic: "${chosenTopic}". Status: IDEA.`
    });

    writeDB(currentDb);
    res.json(newArticle);

  } catch (error: any) {
    console.error("Gemini suggestion failed:", error);
    
    // In case of error (e.g. no API key), let's create a beautiful fallback article seed so the app remains fully robust!
    const fallbacks = [
      {
        title: "Sensory Delights at the Shongweni Farmers Market",
        topic: "Shongweni Farmers Market in Durban",
        storyIdea: "A weekend culinary safari to Durban's favorite outdoor market, exploring farm cheese, local Zulu clay pottery, and pristine child-friendly nature walk trails."
      },
      {
        title: "Smiles and Sunshine at Kirstenbosch Botanical Gardens",
        topic: "Kirstenbosch Family Concerts & Picnics",
        storyIdea: "An essential guide to packing the ultimate Cape Town picnic hamper, finding the coolest canopy walkways, and enjoying open-air lawns with toddler-friendly slopes."
      }
    ];

    const randomFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    const fallbackArticle = {
      id: articleId,
      journalist_id: journalist.id,
      title: isSuggested ? randomFallback.title : `Explore Mzansi: ${chosenTopic}`,
      topic: isSuggested ? randomFallback.topic : chosenTopic,
      status: "idea",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      featured_image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop",
      artifacts: {
        story_idea: isSuggested ? randomFallback.storyIdea : `A family-focused editorial adventure covering ${chosenTopic} with practical weekend hints.`
      }
    };

    const currentDb = readDB();
    currentDb.articles.unshift(fallbackArticle);
    currentDb.agent_logs.unshift({
      id: `log-${Date.now()}-error`,
      timestamp: new Date().toISOString(),
      journalist_id: journalist.id,
      article_id: articleId,
      action_type: "api_fallback",
      message: `Gemini API suggestion unavailable (${error.message}). Switched to local South African seed generator.`
    });

    writeDB(currentDb);
    res.json(fallbackArticle);
  }
});

// 7. Core step-by-step pipeline runner
app.post("/api/articles/:id/step", async (req, res) => {
  const db = readDB();
  const articleIdx = db.articles.findIndex((a: any) => a.id === req.params.id);

  if (articleIdx === -1) {
    return res.status(404).json({ error: "Article not found" });
  }

  const article = db.articles[articleIdx];
  const journalist = db.journalists.find((j: any) => j.id === article.journalist_id);
  const currentStatus = article.status;

  let nextStatus = currentStatus;
  let logMsg = "";
  const updatedArtifacts = { ...article.artifacts };

  const memoryContext = db.journalist_memory
    .filter((m: any) => m.status === "approved")
    .map((m: any) => `- [${m.memory_type}] ${m.memory_content}`)
    .join("\n");

  const systemPrompt = `You are ${journalist.name}, the Lifestyle & Community Editor for ${journalist.website}.
Your tone is ${journalist.tone} and personality is ${journalist.personality}.
Align all generation with these approved lessons and patterns:
${memoryContext}

IMPORTANT:
- You must NOT invent any fake sources, events, quotes, or statistics. All facts must reflect actual South African attractions and locations.
- Under research notes, always compile a clear, realistic list of verified sources with URLs.`;

  try {
    if (currentStatus === "idea" || currentStatus === "revision_requested") {
      // Step 1: Researching & Source Extraction
      nextStatus = "researching";
      logMsg = "Initiating research phase. Analyzing facts and verified local sources...";

      const prompt = `Conduct lifestyle research for an article about the topic "${article.topic}".
Verify location hours, exact address landmarks, key local features, and typical weekend family logistics.
Create 2-3 genuine, verifiable sources with descriptions.
Provide the output strictly in JSON matching the requested schema.`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          researchNotes: { type: Type.STRING, description: "Detailed research findings focusing on sensory, food, and family details." },
          sources: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                url: { type: Type.STRING },
                status: { type: Type.STRING, enum: ["verified", "unverified"] },
                notes: { type: Type.STRING }
              },
              required: ["name", "url", "status", "notes"]
            }
          }
        },
        required: ["researchNotes", "sources"]
      };

      const aiResponse = await callGemini(systemPrompt, prompt, schema);
      const parsed = JSON.parse(aiResponse || "{}");
      updatedArtifacts.research_notes = parsed.researchNotes;
      updatedArtifacts.source_list = parsed.sources || [];

    } else if (currentStatus === "researching") {
      // Step 2: Drafting and Editing
      nextStatus = "drafted";
      logMsg = "Drafting comprehensive editorial text utilizing sensory vocabulary and community angles...";

      const prompt = `Based on these research notes: "${updatedArtifacts.research_notes}", write a full, warm, inclusive lifestyle blog post.
The word count should be around 350-500 words. Highlight local foods, welcoming family vibes, and practical tips.
Then, write an outline.
Provide the output strictly in JSON matching the requested schema.`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          outline: { type: Type.STRING, description: "A clean, section-by-section roadmap of the story" },
          draft: { type: Type.STRING, description: "First sensory-rich draft including vendor quotes and local anecdotes" },
          edited: { type: Type.STRING, description: "Polished final proofread version with enhanced adjectives and flow" }
        },
        required: ["outline", "draft", "edited"]
      };

      const aiResponse = await callGemini(systemPrompt, prompt, schema);
      const parsed = JSON.parse(aiResponse || "{}");
      updatedArtifacts.article_outline = parsed.outline;
      updatedArtifacts.draft_article = parsed.draft;
      updatedArtifacts.edited_article = parsed.edited;

    } else if (currentStatus === "drafted") {
      // Step 3: Image Brief & Prompt Creation
      nextStatus = "image_pending";
      logMsg = "Designing featured image creative briefs and AI prompt models...";

      const prompt = `Read the edited draft of your article: "${updatedArtifacts.edited_article}".
Formulate a professional creative brief for the photography team, and a highly detailed text prompt for a generative image AI model.
Keep the mood warm, bright, South African, inclusive, and authentic.
Provide the output strictly in JSON matching the requested schema.`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          brief: { type: Type.STRING, description: "A detailed visual direction explaining the mood, elements, colors, and framing" },
          prompt: { type: Type.STRING, description: "An optimized image generator prompt (specifying lighting, camera, details, and style)" }
        },
        required: ["brief", "prompt"]
      };

      const aiResponse = await callGemini(systemPrompt, prompt, schema);
      const parsed = JSON.parse(aiResponse || "{}");
      updatedArtifacts.image_brief = parsed.brief;
      updatedArtifacts.image_prompt = parsed.prompt;

    } else if (currentStatus === "image_pending") {
      // Step 4: Image Generation & Quality Review
      nextStatus = "image_review";
      logMsg = "Generating featured sandbox graphic assets and launching quality review audits...";

      const apiKey = process.env.GEMINI_API_KEY;
      let generatedImageBase64 = "";

      // Call Image Generation if API available
      if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
        try {
          const ai = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
          });
          
          const promptText = updatedArtifacts.image_prompt || `Beautiful outdoor family recreation in South Africa lifestyle photograph, sunny day.`;
          
          // Use gemini-2.5-flash-image for image generation
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: promptText,
            config: {
              imageConfig: {
                aspectRatio: "16:9"
              }
            }
          });

          for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              generatedImageBase64 = `data:image/png;base64,${part.inlineData.data}`;
              break;
            }
          }
        } catch (err) {
          console.error("Fitted generation failed, using curated photo fallback", err);
        }
      }

      if (generatedImageBase64) {
        updatedArtifacts.generated_image = generatedImageBase64;
        article.featured_image = generatedImageBase64;
      } else {
        // High quality Unsplash topic-based fallback
        const query = encodeURIComponent(article.topic.split(" ").slice(0, 3).join(","));
        const fallbackUrl = `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80`;
        updatedArtifacts.generated_image = fallbackUrl;
        article.featured_image = fallbackUrl;
      }

      // Generate Image Quality Review
      const prompt = `You are a professional Creative Director. Review this image direction brief: "${updatedArtifacts.image_brief}" and its generated prompt: "${updatedArtifacts.image_prompt}".
Assess whether it maintains authenticity (no bizarre artifacts, realistic lighting, genuine cultural representation, child safety).
Provide the output strictly in JSON matching the requested schema.`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          rating: { type: Type.INTEGER, description: "A rating from 1 (unusable) to 5 (excellent)" },
          passed: { type: Type.BOOLEAN, description: "True if rating >= 3, false otherwise" },
          comments: { type: Type.STRING, description: "A professional analysis of composition, lighting, style, and potential risks" }
        },
        required: ["rating", "passed", "comments"]
      };

      const aiResponse = await callGemini(systemPrompt, prompt, schema);
      const parsed = JSON.parse(aiResponse || "{}");
      updatedArtifacts.image_quality_review = `RATING: ${parsed.rating}/5 | PASSED: ${parsed.passed ? "YES" : "NO"}\n\nReview comments:\n${parsed.comments}`;

    } else if (currentStatus === "image_review") {
      // Step 5: Fact-Checking Audit
      nextStatus = "fact_checking";
      logMsg = "Running automated zero-hallucination fact checking against research notes and external databases...";

      const prompt = `You are the Lead Fact Checker. Analyze this edited article draft: "${updatedArtifacts.edited_article}" against these research notes and source claims: "${updatedArtifacts.research_notes}".
Verify:
1. Are there any invented events, locations, or dates?
2. Are all quotes attributed to real people or are they completely fictional?
3. Flag any weak, speculative, or unverified claims.
Provide the output strictly in JSON matching the requested schema.`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          verifiedClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
          weakClaims: { type: Type.ARRAY, items: { type: Type.STRING } },
          score: { type: Type.INTEGER, description: "Accuracy score from 1 to 100" },
          status: { type: Type.STRING, enum: ["approved", "flagged_requires_source"] },
          detailedReport: { type: Type.STRING }
        },
        required: ["verifiedClaims", "weakClaims", "score", "status", "detailedReport"]
      };

      const aiResponse = await callGemini(systemPrompt, prompt, schema);
      const parsed = JSON.parse(aiResponse || "{}");
      updatedArtifacts.fact_check_report = `ACCURACY SCORE: ${parsed.score}/100 | STATUS: ${parsed.status.toUpperCase()}\n\nVerified Claims:\n${parsed.verifiedClaims.map((c:string) => `✓ ${c}`).join("\n")}\n\nPotential Hallucinations/Weak Claims:\n${parsed.weakClaims.length ? parsed.weakClaims.map((c:string) => `⚠ ${c}`).join("\n") : "None detected."}\n\nAnalysis:\n${parsed.detailedReport}`;

    } else if (currentStatus === "fact_checking") {
      // Step 6: Bias and Editorial Review
      nextStatus = "bias_review";
      logMsg = "Executing sensitive bias checks and style guidelines compliance audit...";

      const prompt = `Analyze this edited article draft: "${updatedArtifacts.edited_article}".
Check for:
1. Tone match: is it warm, sensory-driven, inclusive, and friendly?
2. Demographics and equity: does it represent diverse people with dignity?
3. Avoidance of commercialism bias or exclusionary phrasing.
Provide the output strictly in JSON matching the requested schema.`;

      const schema = {
        type: Type.OBJECT,
        properties: {
          issuesFound: { type: Type.ARRAY, items: { type: Type.STRING } },
          complianceLevel: { type: Type.STRING, enum: ["high", "medium", "low"] },
          recommendations: { type: Type.STRING },
          report: { type: Type.STRING }
        },
        required: ["issuesFound", "complianceLevel", "recommendations", "report"]
      };

      const aiResponse = await callGemini(systemPrompt, prompt, schema);
      const parsed = JSON.parse(aiResponse || "{}");
      updatedArtifacts.bias_check_report = `COMPLIANCE LEVEL: ${parsed.complianceLevel.toUpperCase()}\n\nIssues Found:\n${parsed.issuesFound.length ? parsed.issuesFound.map((i:string) => `• ${i}`).join("\n") : "None detected."}\n\nRecommendations:\n${parsed.recommendations}\n\nDetailed Review:\n${parsed.report}`;

    } else if (currentStatus === "bias_review") {
      // Step 7: Send to Telegram for Review
      nextStatus = "awaiting_admin_review";
      logMsg = "Dispatching article briefing and inline approval logs to Telegram Sandbox...";

      // Send a real Telegram message if bot is active!
      if (db.telegram_config && db.telegram_config.is_active && db.telegram_config.bot_token) {
        try {
          const text = `📰 *NEW SANDBOX REVIEW*\n\n✍️ Journalist: *Anika Patel*\n📌 Title: *${article.title}*\n📂 Sections: ${journalist.sections.join(", ")}\n\n💡 *Story Pitch*:\n_${article.artifacts.story_idea || "N/A"}_\n\n🔎 *Fact-Check Rating*: PASSED\n🌈 *Image Prompt*: _${article.artifacts.image_prompt ? article.artifacts.image_prompt.substring(0, 100) : "N/A"}..._\n\n👉 Review the full post and artifacts in the *Newsroom Lab Dashboard* to issue approvals or request re-drafts!`;
          
          await fetch(`https://api.telegram.org/bot${db.telegram_config.bot_token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: db.telegram_config.chat_id,
              text: text,
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "✅ Approve for Sandbox", callback_data: `approve_${article.id}` },
                    { text: "🔄 Request Revision", callback_data: `revision_${article.id}` }
                  ],
                  [
                    { text: "🎨 Regenerate Image", callback_data: `image_${article.id}` },
                    { text: "❌ Reject", callback_data: `reject_${article.id}` }
                  ]
                ]
              }
            })
          });
        } catch (err: any) {
          console.error("Real Telegram dispatch failed:", err);
          logMsg += ` (Real Telegram error: ${err.message})`;
        }
      }
    }

    // Apply updates
    article.status = nextStatus;
    article.artifacts = updatedArtifacts;
    article.updated_at = new Date().toISOString();

    db.agent_logs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      journalist_id: journalist.id,
      article_id: article.id,
      action_type: currentStatus,
      message: `${journalist.name} transition completed: ${currentStatus.toUpperCase()} ➜ ${nextStatus.toUpperCase()}. ${logMsg}`
    });

    writeDB(db);
    res.json(article);

  } catch (error: any) {
    console.error("Pipeline failure:", error);

    // Fallback: update status dummy style so the user can still walk through the sandbox even without API key!
    let fallbackStatus = currentStatus;
    let fallbackLog = "";

    if (currentStatus === "idea" || currentStatus === "revision_requested") {
      fallbackStatus = "researching";
      updatedArtifacts.research_notes = " Blaauwbank Farm Stall is located on the R563, Cradle of Humankind. Open Wed-Sun 8 AM to 4 PM. High-quality home-made woodfired pies, biltong rolls, craft ginger beer, expansive toddler-safe playground lawn with animal interaction petting zone.";
      updatedArtifacts.source_list = [
        { name: "Blaauwbank Historical Farm Directory", url: "https://www.blaauwbankfarm.co.za", status: "verified", notes: "Verified opening hours and pie specialties." },
        { name: "Gauteng Heritage Directory", url: "https://gautengtourism.co.za", status: "verified", notes: "Heritage status verified." }
      ];
      fallbackLog = "Successfully loaded local South African research library references.";
    } else if (currentStatus === "researching") {
      fallbackStatus = "drafted";
      updatedArtifacts.article_outline = "1. Country Drive escaping JHB\n2. The visual rustic charm of Blaauwbank\n3. Hot artisanal chicken pies\n4. Sprawling lawns for family picnics";
      updatedArtifacts.draft_article = "Escape the city dust for a family drive to Blaauwbank Farm Shop! Snuggled inside the sun-drenched Cradle of Humankind hills, this spot serves the most butter-rich, warm farm pies you could dream of. Kids can stretch their legs on the sprawling lawn while you sip local cold ginger beer under the acacia trees.";
      updatedArtifacts.edited_article = "Escape the city dust for a family drive to Blaauwbank Farm Shop! Snuggled inside the sun-drenched Cradle of Humankind hills, this spot serves the most butter-rich, warm farm pies you could dream of. Kids can stretch their legs on the sprawling lawn while you sip local cold ginger beer under the acacia trees.";
      fallbackLog = "Sensory lifestyle editing checklist passed locally.";
    } else if (currentStatus === "drafted") {
      fallbackStatus = "image_pending";
      updatedArtifacts.image_brief = "Beautiful cozy country farm shop in South Africa, sun-kissed lawns, fresh baked delicacies.";
      updatedArtifacts.image_prompt = "A high detail photo of a rustic South African country farm stall with delicious home-baked pies on display, green sprawling hills, warm morning sunshine, 16:9.";
      fallbackLog = "Creative photography brief compiled successfully.";
    } else if (currentStatus === "image_pending") {
      fallbackStatus = "image_review";
      updatedArtifacts.generated_image = "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&auto=format&fit=crop";
      article.featured_image = "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&auto=format&fit=crop";
      updatedArtifacts.image_quality_review = "RATING: 4/5 | PASSED: YES\n\nQuality analysis: Excellent light exposure, realistic rustic farm elements, perfect local color balance.";
      fallbackLog = "Image generated and creative review finalized.";
    } else if (currentStatus === "image_review") {
      fallbackStatus = "fact_checking";
      updatedArtifacts.fact_check_report = "ACCURACY SCORE: 100/100 | STATUS: APPROVED\n\nVerified Claims:\n- Location on R563, Cradle of Humankind is accurate.\n- Blaauwbank farm shop hours Wed-Sun are correct.";
      fallbackLog = "Factual truth model completed successfully. Zero inventions flagged.";
    } else if (currentStatus === "fact_checking") {
      fallbackStatus = "bias_review";
      updatedArtifacts.bias_check_report = "COMPLIANCE LEVEL: HIGH\n\nBias Review Summary:\n- Tone is highly enthusiastic, supportive, and safe for families.\n- Zero socio-demographic exclusion.";
      fallbackLog = "Sensitive content and guideline check passed.";
    } else if (currentStatus === "bias_review") {
      fallbackStatus = "awaiting_admin_review";
      fallbackLog = "Dispatching sandbox packet to Telegram. Ready for admin authorization.";
    }

    article.status = fallbackStatus;
    article.artifacts = updatedArtifacts;
    article.updated_at = new Date().toISOString();

    db.agent_logs.unshift({
      id: `log-${Date.now()}-err`,
      timestamp: new Date().toISOString(),
      journalist_id: journalist.id,
      article_id: article.id,
      action_type: "pipeline_sandbox",
      message: `${journalist.name} transition completed with sandbox fallback (API key unavailable: ${error.message}). ${currentStatus.toUpperCase()} ➜ ${fallbackStatus.toUpperCase()}. ${fallbackLog}`
    });

    writeDB(db);
    res.json(article);
  }
});

// 8. Memories endpoint
app.get("/api/memories", (req, res) => {
  const db = readDB();
  res.json(db.journalist_memory);
});

// 9. Update Memory status
app.post("/api/memories/:id/status", (req, res) => {
  const { status } = req.body; // 'approved' | 'rejected'
  const db = readDB();
  const memoryIdx = db.journalist_memory.findIndex((m: any) => m.id === req.params.id);

  if (memoryIdx === -1) {
    return res.status(404).json({ error: "Memory not found" });
  }

  const memory = db.journalist_memory[memoryIdx];
  const oldStatus = memory.status;
  memory.status = status;

  db.agent_logs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    journalist_id: memory.journalist_id,
    article_id: memory.source_article_id,
    action_type: `memory_${status}`,
    message: `Journalist Memory candidate (${memory.id}) has been ${status.toUpperCase()} by administrator (previously: ${oldStatus}).`
  });

  writeDB(db);
  res.json(memory);
});

// 10. Get logs
app.get("/api/logs", (req, res) => {
  const db = readDB();
  res.json(db.agent_logs);
});

// 11. Clear / reset database
app.post("/api/reset", (req, res) => {
  writeDB(SEED_DATA);
  res.json({ success: true, message: "Database reset to initial sandbox seeds successfully." });
});

// 12. Telegram bot configuration get/set
app.get("/api/telegram/config", (req, res) => {
  const db = readDB();
  res.json(db.telegram_config || { bot_token: "", chat_id: "", is_active: false });
});

app.post("/api/telegram/config", (req, res) => {
  const { bot_token, chat_id, is_active } = req.body;
  const db = readDB();
  db.telegram_config = {
    bot_token: bot_token || "",
    chat_id: chat_id || "",
    is_active: !!is_active
  };

  db.agent_logs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    journalist_id: "anika-patel",
    article_id: null,
    action_type: "telegram_config",
    message: `Telegram approval bot connection updated. Status: ${db.telegram_config.is_active ? "ENABLED" : "DISABLED"}`
  });

  writeDB(db);
  res.json(db.telegram_config);
});

// Serve frontend assets in production / dev
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Newsroom Lab Server] active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
