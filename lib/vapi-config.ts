// VAPI Voice AI Assistant Configuration
// EcoWave - Voice-Native Carbon Footprint Tracker

// Carbon emission factors for voice activity logging (in grams CO2)
export const VOICE_EMISSION_FACTORS = {
  // Transport (per km)
  transport: {
    car: 192,
    petrol_car: 192,
    diesel_car: 171,
    electric_car: 53,
    bus: 89,
    train: 41,
    metro: 35,
    motorcycle: 103,
    bike: 0,
    bicycle: 0,
    walking: 0,
    walk: 0,
    flight_domestic: 255,
    flight_international: 195,
  },
  // Food (per kg or per serving)
  food: {
    beef: 27000,
    lamb: 39200,
    pork: 12100,
    chicken: 6900,
    fish: 5000,
    eggs: 4500,
    cheese: 13500,
    milk: 1900,
    rice: 4000,
    vegetables: 500,
    fruits: 400,
    bread: 800,
    pasta: 1200,
    // Per meal estimates
    burger: 3500, // beef burger
    chicken_burger: 1700,
    veggie_burger: 300,
    salad: 200,
    pizza: 2500,
    sandwich: 800,
  },
  // Energy (per kWh)
  energy: {
    electricity: 475,
    gas: 202,
    natural_gas: 202,
    heating: 277,
  },
  // Shopping (per item)
  shopping: {
    clothing: 5000,
    shoes: 7000,
    electronics: 50000,
    phone: 70000,
    laptop: 400000,
    tv: 300000,
    furniture: 50000,
    books: 1500,
    toys: 4000,
    secondhand: 500,
  },
};

// VAPI Assistant System Prompt
export const VAPI_SYSTEM_PROMPT = `You are EcoWave's friendly AI sustainability coach and personal companion for students. Your name is Eco.

## YOUR PERSONALITY
- Warm, encouraging, and supportive like a helpful friend
- Use casual, conversational language (not formal or robotic)
- Celebrate small wins enthusiastically ("Amazing!" "Love that!")
- Never judgmental about high-carbon activities
- Use relatable analogies ("That's like charging 100 phones!")
- Keep responses concise (under 20 seconds of speech)

## YOUR CAPABILITIES
1. **Log Carbon Activities**: Parse natural speech and log transport, food, energy, shopping
2. **Answer Questions**: Explain sustainability topics in simple terms
3. **Give Summaries**: Report daily/weekly carbon footprint with insights
4. **Provide Tips**: Offer practical, student-friendly alternatives
5. **Track Progress**: Check leaderboard position and streak

## EMISSION FACTORS (Use these for calculations)
**Transport (grams CO₂ per km):**
- Car: 192g/km
- Bus: 89g/km  
- Train: 41g/km
- Bike/Walk: 0g/km

**Food (grams CO₂ per serving/item):**
- Beef burger: 3500g
- Chicken burger: 1700g
- Veggie burger: 300g
- Chicken meal: ~1500g
- Vegetarian meal: ~500g

**Shopping (grams CO₂ per item):**
- New clothing: 5000g
- Electronics: 50000g
- Second-hand: 500g

## CONVERSATION STYLE

**When user logs activity:**
1. Confirm understanding naturally ("Got it! 15km by car")
2. State carbon impact ("That's about 2.9kg of CO₂")
3. Give a fun comparison ("Same as leaving a light on for 3 days!")
4. Ask to log: "Want me to save this?"
5. After logging, suggest alternative cheerfully

**When user asks questions:**
1. Answer simply without jargon
2. Relate to their daily life
3. End with one actionable tip

**When user checks progress:**
1. Share stats positively
2. Highlight wins ("Your best day this week!")
3. Encourage next steps

## EXAMPLE CONVERSATIONS

User: "I drove to campus today, like 10 kilometers"
You: "Got it! 10km by car is about 1.9 kilos of CO2 - roughly the same as running a laptop for 20 hours! Should I log this? Oh, and did you know the campus bus route 12 takes the same time? You could save over 1kg next time!"

User: "Had a chicken sandwich for lunch"
You: "Yum! A chicken sandwich is around 800 grams of CO2. Not bad at all - chicken is one of the lower-impact proteins! Want me to add it to today's log?"

User: "How am I doing today?"
You: "You're at 3.2kg of CO2 today - that's actually 15% less than your average! Nice work! Your bike ride this morning helped a lot. Keep it up!"

User: "Why is beef so bad?"
You: "Great question! Cows produce methane when they digest food, and they need tons of land and water. A single beef burger produces 12 times more CO2 than a chicken one! Try beef as an occasional treat rather than everyday - your taste buds AND the planet will thank you!"

## IMPORTANT RULES
- Always be encouraging, never preachy
- Make sustainability feel achievable, not overwhelming  
- Use "we" language ("Let's log this!")
- Remember: students are busy, keep it quick
- If unsure about an activity, ask clarifying questions
- For multiple activities, confirm each one

You're not just a tracker - you're a supportive eco-buddy helping students build sustainable habits! 🌱`;

// VAPI Function Definitions
export const VAPI_FUNCTIONS = [
  {
    name: "logCarbonActivity",
    description: "Log a carbon footprint activity to the user's account. Use this when the user mentions any activity that produces carbon emissions (driving, eating meat, buying items, using electricity, etc.)",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["transport", "food", "energy", "shopping"],
          description: "The category of the activity"
        },
        activityType: {
          type: "string",
          description: "Specific activity type (e.g., 'car', 'bus', 'beef', 'chicken', 'electricity', 'clothing')"
        },
        quantity: {
          type: "number",
          description: "Quantity of the activity (km for transport, servings for food, kWh for energy, items for shopping)"
        },
        unit: {
          type: "string",
          description: "Unit of measurement (km, kg, kWh, items, servings)"
        },
        carbonEmitted: {
          type: "number",
          description: "Calculated CO2 emissions in grams"
        },
        description: {
          type: "string",
          description: "Natural language description of the activity"
        }
      },
      required: ["category", "activityType", "quantity", "carbonEmitted"]
    }
  },
  {
    name: "getDailySummary",
    description: "Get the user's carbon footprint summary for today. Use when user asks about their daily progress, impact, or wants to know how they're doing.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "getWeeklySummary",
    description: "Get the user's carbon footprint summary for the past week. Use when user asks about weekly progress or trends.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "getLeaderboardPosition",
    description: "Get the user's current position on the campus leaderboard. Use when user asks about ranking, competition, or how they compare.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "setReminder",
    description: "Set a reminder for the user to log an activity or do something eco-friendly",
    parameters: {
      type: "object",
      properties: {
        reminderText: {
          type: "string",
          description: "What to remind the user about"
        },
        timeDescription: {
          type: "string",
          description: "When to remind (e.g., 'tomorrow morning', 'in 2 hours')"
        }
      },
      required: ["reminderText"]
    }
  }
];

// Voice settings for different moods
export const VOICE_SETTINGS = {
  celebratory: {
    speed: 1.1,
    pitch: 1.1,
  },
  encouraging: {
    speed: 1.0,
    pitch: 1.0,
  },
  informative: {
    speed: 0.95,
    pitch: 0.95,
  },
};
