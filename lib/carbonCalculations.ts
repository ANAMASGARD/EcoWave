// Carbon emission factors and calculation utilities
// All values in grams of CO2

export type ActivityCategory = 'transport' | 'food' | 'energy' | 'shopping';

export interface CarbonActivity {
  id: number;
  category: ActivityCategory;
  activityName: string;
  emissionFactor: number; // CO2 in grams per unit
  unit: string; // km, kwh, kg, item
  description: string | null;
}

// Predefined carbon activities with emission factors
export const defaultCarbonActivities: Omit<CarbonActivity, 'id'>[] = [
  // Transport
  { category: 'transport', activityName: 'Car (petrol)', emissionFactor: 192, unit: 'km', description: 'Average petrol car emissions per kilometer' },
  { category: 'transport', activityName: 'Car (diesel)', emissionFactor: 171, unit: 'km', description: 'Average diesel car emissions per kilometer' },
  { category: 'transport', activityName: 'Car (electric)', emissionFactor: 53, unit: 'km', description: 'Average electric car emissions per kilometer' },
  { category: 'transport', activityName: 'Bus', emissionFactor: 89, unit: 'km', description: 'Public bus emissions per kilometer' },
  { category: 'transport', activityName: 'Train', emissionFactor: 41, unit: 'km', description: 'Train emissions per kilometer' },
  { category: 'transport', activityName: 'Motorcycle', emissionFactor: 103, unit: 'km', description: 'Motorcycle emissions per kilometer' },
  { category: 'transport', activityName: 'Bicycle', emissionFactor: 0, unit: 'km', description: 'Zero emissions' },
  { category: 'transport', activityName: 'Walking', emissionFactor: 0, unit: 'km', description: 'Zero emissions' },
  
  // Food
  { category: 'food', activityName: 'Beef', emissionFactor: 27000, unit: 'kg', description: 'Beef production emissions per kg' },
  { category: 'food', activityName: 'Lamb', emissionFactor: 39200, unit: 'kg', description: 'Lamb production emissions per kg' },
  { category: 'food', activityName: 'Pork', emissionFactor: 12100, unit: 'kg', description: 'Pork production emissions per kg' },
  { category: 'food', activityName: 'Chicken', emissionFactor: 6900, unit: 'kg', description: 'Chicken production emissions per kg' },
  { category: 'food', activityName: 'Fish', emissionFactor: 5000, unit: 'kg', description: 'Fish production emissions per kg' },
  { category: 'food', activityName: 'Cheese', emissionFactor: 13500, unit: 'kg', description: 'Cheese production emissions per kg' },
  { category: 'food', activityName: 'Milk', emissionFactor: 1900, unit: 'liter', description: 'Milk production emissions per liter' },
  { category: 'food', activityName: 'Eggs', emissionFactor: 4500, unit: 'kg', description: 'Eggs production emissions per kg' },
  { category: 'food', activityName: 'Rice', emissionFactor: 4000, unit: 'kg', description: 'Rice production emissions per kg' },
  { category: 'food', activityName: 'Vegetables', emissionFactor: 500, unit: 'kg', description: 'Average vegetable production emissions per kg' },
  { category: 'food', activityName: 'Fruits', emissionFactor: 400, unit: 'kg', description: 'Average fruit production emissions per kg' },
  { category: 'food', activityName: 'Plant-based meal', emissionFactor: 1500, unit: 'meal', description: 'Average plant-based meal emissions' },
  
  // Energy
  { category: 'energy', activityName: 'Electricity (grid)', emissionFactor: 475, unit: 'kwh', description: 'Grid electricity emissions per kWh' },
  { category: 'energy', activityName: 'Natural gas', emissionFactor: 202, unit: 'kwh', description: 'Natural gas emissions per kWh' },
  { category: 'energy', activityName: 'Heating oil', emissionFactor: 277, unit: 'liter', description: 'Heating oil emissions per liter' },
  { category: 'energy', activityName: 'Solar power', emissionFactor: 0, unit: 'kwh', description: 'Zero emissions from solar' },
  
  // Shopping
  { category: 'shopping', activityName: 'New clothing (cotton)', emissionFactor: 5000, unit: 'item', description: 'Average cotton garment emissions' },
  { category: 'shopping', activityName: 'New clothing (synthetic)', emissionFactor: 7000, unit: 'item', description: 'Average synthetic garment emissions' },
  { category: 'shopping', activityName: 'Electronics', emissionFactor: 50000, unit: 'item', description: 'Average electronics device emissions' },
  { category: 'shopping', activityName: 'Second-hand item', emissionFactor: 500, unit: 'item', description: 'Reduced emissions from reuse' },
  { category: 'shopping', activityName: 'Plastic bottle', emissionFactor: 82, unit: 'item', description: 'Single-use plastic bottle emissions' },
  { category: 'shopping', activityName: 'Paper product', emissionFactor: 1000, unit: 'kg', description: 'Paper production emissions per kg' },
];

// Calculate carbon emissions for an activity
export function calculateCarbonEmission(emissionFactor: number, quantity: number): number {
  return Math.round(emissionFactor * quantity);
}

// Convert grams to more readable units
export function formatCarbonEmission(grams: number): string {
  if (grams < 1000) {
    return `${grams}g CO₂`;
  } else if (grams < 1000000) {
    return `${(grams / 1000).toFixed(2)}kg CO₂`;
  } else {
    return `${(grams / 1000000).toFixed(2)}t CO₂`;
  }
}

// Calculate carbon offset from waste collection
// Average: 1kg of waste diverted from landfill = 0.5kg CO2 saved
export function calculateWasteCarbonOffset(wasteAmount: string): number {
  const match = wasteAmount.match(/(\d+(\.\d+)?)/);
  const amount = match ? parseFloat(match[0]) : 0;
  return Math.round(amount * 500); // 500 grams CO2 per kg of waste
}

// Get color coding for emission levels (for UI)
export function getEmissionColor(grams: number): string {
  if (grams < 500) return 'text-green-600 dark:text-green-400'; // Low
  if (grams < 2000) return 'text-yellow-600 dark:text-yellow-400'; // Medium
  return 'text-red-600 dark:text-red-400'; // High
}

// Calculate daily average for a user
export function calculateDailyAverage(totalEmissions: number, days: number): number {
  if (days === 0) return 0;
  return Math.round(totalEmissions / days);
}

// Generate AI prompt for personalized tips
export function generateTipsPrompt(dailyLogs: Array<{ category: string; carbonEmitted: number; activityName: string }>): string {
  const totalEmissions = dailyLogs.reduce((sum, log) => sum + log.carbonEmitted, 0);
  const categorySummary = dailyLogs.reduce((acc, log) => {
    acc[log.category] = (acc[log.category] || 0) + log.carbonEmitted;
    return acc;
  }, {} as Record<string, number>);

  return `You are an environmental advisor. A student has logged the following carbon footprint activities today:
Total emissions: ${formatCarbonEmission(totalEmissions)}

Breakdown by category:
${Object.entries(categorySummary).map(([cat, val]) => `- ${cat}: ${formatCarbonEmission(val)}`).join('\n')}

Activities:
${dailyLogs.map(log => `- ${log.activityName}: ${formatCarbonEmission(log.carbonEmitted)}`).join('\n')}

Provide 3 specific, actionable, beginner-friendly tips to help reduce their carbon footprint. Keep it positive, encouraging, and practical for a student. Format as JSON:
{
  "tips": [
    "tip 1 text here",
    "tip 2 text here",
    "tip 3 text here"
  ]
}`;
}
