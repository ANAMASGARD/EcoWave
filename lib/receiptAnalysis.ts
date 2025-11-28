// Receipt Analysis Utilities with Gemini AI
// Handles OCR, product categorization, and carbon calculations

export interface ReceiptItem {
  itemName: string;
  category: string;
  quantity: number;
  price?: string;
  carbonEmission: number; // in grams
  confidence: number; // 0-100
}

export interface ReceiptAnalysisResult {
  storeName: string;
  purchaseDate: string;
  totalAmount: string;
  items: ReceiptItem[];
  totalCarbon: number; // in grams
  itemCount: number;
  rawResponse?: string;
}

// Carbon emission factors for shopping categories (in grams CO2)
export const SHOPPING_EMISSION_FACTORS = {
  electronics: 50000, // 50kg per item
  'electronics-accessory': 5000, // 5kg for accessories
  clothing: 5000, // 5kg per garment
  shoes: 7000, // 7kg per pair
  'personal-care': 2000, // 2kg per item
  'cleaning-supplies': 1500, // 1.5kg per item
  'packaged-food': 1000, // 1kg per item (varies)
  'fresh-food': 500, // 0.5kg per item
  beverages: 500, // 0.5kg per item
  'snacks-candy': 800, // 0.8kg per item
  'dairy-products': 1900, // 1.9kg per item
  'meat-products': 5000, // 5kg per item (average)
  'household-items': 3000, // 3kg per item
  books: 1500, // 1.5kg per book
  toys: 4000, // 4kg per toy
  furniture: 50000, // 50kg per item
  'office-supplies': 1000, // 1kg per item
  other: 2000, // 2kg default
};

// Generate Gemini AI prompt for receipt OCR and analysis
export function generateReceiptAnalysisPrompt(): string {
  return `You are an expert receipt analyzer and environmental consultant. Analyze this receipt image and extract the following information:

1. Store/merchant name
2. Purchase date (if visible)
3. Total amount paid
4. List of all items purchased with their quantities

For EACH item, you must:
- Identify the product name
- Categorize it into one of these categories: electronics, electronics-accessory, clothing, shoes, personal-care, cleaning-supplies, packaged-food, fresh-food, beverages, snacks-candy, dairy-products, meat-products, household-items, books, toys, furniture, office-supplies, other
- Estimate quantity (if not explicitly shown, assume 1)
- Extract price if visible
- Rate your confidence in the categorization (0-100)

IMPORTANT RULES:
1. Be specific with categories - use the exact category names provided
2. For food items, distinguish between fresh-food, packaged-food, snacks-candy, dairy-products, and meat-products
3. For unclear items, use your best judgment and lower the confidence score
4. If an item name is abbreviated or unclear, expand it to the most likely full name

Respond ONLY in valid JSON format:
{
  "storeName": "extracted store name or 'Unknown Store'",
  "purchaseDate": "YYYY-MM-DD or 'Unknown'",
  "totalAmount": "extracted total or 'N/A'",
  "items": [
    {
      "itemName": "full product name",
      "category": "one of the specified categories",
      "quantity": number,
      "price": "price as string or null",
      "confidence": number between 0-100
    }
  ]
}

If the image is not a receipt or is too blurry to read, return:
{
  "error": "Unable to process receipt",
  "storeName": "Unknown Store",
  "purchaseDate": "Unknown",
  "totalAmount": "N/A",
  "items": []
}`;
}

// Calculate carbon emissions for a scanned item
export function calculateItemCarbon(category: string, quantity: number = 1): number {
  const emissionFactor = SHOPPING_EMISSION_FACTORS[category as keyof typeof SHOPPING_EMISSION_FACTORS] || SHOPPING_EMISSION_FACTORS.other;
  return Math.round(emissionFactor * quantity);
}

// Parse and validate Gemini AI response
export function parseReceiptAnalysisResponse(responseText: string): ReceiptAnalysisResult {
  try {
    // Clean the response text
    let cleanedText = responseText.trim();
    
    // Remove markdown code blocks if present
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Find JSON boundaries
    const jsonStart = cleanedText.indexOf('{');
    const jsonEnd = cleanedText.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
    }
    
    const parsed = JSON.parse(cleanedText);
    
    // Check for error response
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    
    // Validate required fields
    if (!parsed.items || !Array.isArray(parsed.items)) {
      throw new Error('Invalid response: missing items array');
    }
    
    // Calculate carbon for each item
    const processedItems: ReceiptItem[] = parsed.items.map((item: any) => {
      const carbonEmission = calculateItemCarbon(item.category, item.quantity || 1);
      return {
        itemName: item.itemName || 'Unknown Item',
        category: item.category || 'other',
        quantity: item.quantity || 1,
        price: item.price || null,
        carbonEmission,
        confidence: Math.min(Math.max(item.confidence || 70, 0), 100), // clamp between 0-100
      };
    });
    
    // Calculate total carbon
    const totalCarbon = processedItems.reduce((sum, item) => sum + item.carbonEmission, 0);
    
    return {
      storeName: parsed.storeName || 'Unknown Store',
      purchaseDate: parsed.purchaseDate || new Date().toISOString().split('T')[0],
      totalAmount: parsed.totalAmount || 'N/A',
      items: processedItems,
      totalCarbon,
      itemCount: processedItems.length,
      rawResponse: responseText,
    };
  } catch (error) {
    console.error('Error parsing receipt analysis response:', error);
    throw new Error('Failed to parse AI response. Please try a clearer image.');
  }
}

// Format carbon emission for display
export function formatReceiptCarbon(grams: number): string {
  if (grams < 1000) {
    return `${grams}g CO₂`;
  } else {
    return `${(grams / 1000).toFixed(2)}kg CO₂`;
  }
}

// Get color coding for emission levels
export function getReceiptEmissionColor(grams: number): string {
  if (grams < 2000) return 'text-green-600 dark:text-green-400'; // Low (< 2kg)
  if (grams < 10000) return 'text-yellow-600 dark:text-yellow-400'; // Medium (2-10kg)
  return 'text-red-600 dark:text-red-400'; // High (> 10kg)
}

// Generate insights based on receipt items
export function generateReceiptInsights(items: ReceiptItem[]): string[] {
  const insights: string[] = [];
  
  // Category breakdown
  const categoryTotals = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.carbonEmission;
    return acc;
  }, {} as Record<string, number>);
  
  // Find highest carbon category
  const highestCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  if (highestCategory && highestCategory[1] > 0) {
    const categoryName = highestCategory[0].replace(/-/g, ' ');
    insights.push(`${categoryName} items contributed the most to your carbon footprint on this receipt`);
  }
  
  // Count high-emission items
  const highEmissionItems = items.filter(item => item.carbonEmission > 5000).length;
  if (highEmissionItems > 0) {
    insights.push(`${highEmissionItems} item${highEmissionItems > 1 ? 's' : ''} had high carbon emissions (>5kg CO₂)`);
  }
  
  // Suggest alternatives
  const hasElectronics = items.some(item => item.category === 'electronics');
  const hasMeat = items.some(item => item.category === 'meat-products');
  const hasPackagedFood = items.some(item => item.category === 'packaged-food');
  
  if (hasElectronics) {
    insights.push('Consider buying refurbished electronics to reduce carbon by up to 70%');
  }
  if (hasMeat) {
    insights.push('Swapping some meat products for plant-based alternatives can significantly reduce your footprint');
  }
  if (hasPackagedFood) {
    insights.push('Fresh, local produce typically has a lower carbon footprint than packaged foods');
  }
  
  return insights;
}

// Calculate potential savings
export function calculatePotentialSavings(items: ReceiptItem[]): { category: string; current: number; potential: number; savings: number }[] {
  const savings = [];
  
  // Electronics - buy refurbished (70% reduction)
  const electronicsCarbon = items
    .filter(item => item.category === 'electronics')
    .reduce((sum, item) => sum + item.carbonEmission, 0);
  if (electronicsCarbon > 0) {
    savings.push({
      category: 'Electronics (buy refurbished)',
      current: electronicsCarbon,
      potential: Math.round(electronicsCarbon * 0.3),
      savings: Math.round(electronicsCarbon * 0.7),
    });
  }
  
  // Meat products - switch to plant-based (80% reduction)
  const meatCarbon = items
    .filter(item => item.category === 'meat-products')
    .reduce((sum, item) => sum + item.carbonEmission, 0);
  if (meatCarbon > 0) {
    savings.push({
      category: 'Meat (switch to plant-based)',
      current: meatCarbon,
      potential: Math.round(meatCarbon * 0.2),
      savings: Math.round(meatCarbon * 0.8),
    });
  }
  
  // Packaged food - buy fresh/local (40% reduction)
  const packagedFoodCarbon = items
    .filter(item => item.category === 'packaged-food')
    .reduce((sum, item) => sum + item.carbonEmission, 0);
  if (packagedFoodCarbon > 0) {
    savings.push({
      category: 'Packaged Food (buy fresh/local)',
      current: packagedFoodCarbon,
      potential: Math.round(packagedFoodCarbon * 0.6),
      savings: Math.round(packagedFoodCarbon * 0.4),
    });
  }
  
  return savings;
}
