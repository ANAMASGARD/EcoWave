"use server";

import { db } from './dbConfig';
import { Users, Reports, Rewards, CollectedWastes, Notifications, Transactions, CarbonActivities, DailyLogs, ReceiptScans, ScannedItems, CampusGroups, UserProfiles } from './schema';
import { eq, sql, and, desc, ne, gte, lte } from 'drizzle-orm';

export async function createUser(email: string, name: string) {
  try {
    const [user] = await db.insert(Users).values({ email, name }).returning().execute();
    return user;
  } catch (error) {
    console.error("Error creating user:", error);
    return null;
  }
}

export async function getUserByEmail(email: string) {
  try {
    const [user] = await db.select().from(Users).where(eq(Users.email, email)).execute();
    return user;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return null;
  }
}

export async function createReport(
  userId: number,
  location: string,
  wasteType: string,
  amount: string,
  imageUrl?: string,
  type?: string,
  verificationResult?: any
) {
  try {
    const [report] = await db
      .insert(Reports)
      .values({
        userId,
        location,
        wasteType,
        amount,
        imageUrl,
        verificationResult,
        status: "pending",
      })
      .returning()
      .execute();

    // Award 10 points for reporting waste
    const pointsEarned = 10;
    await updateRewardPoints(userId, pointsEarned);

    // Create a transaction for the earned points
    await createTransaction(userId, 'earned_report', pointsEarned, 'Points earned for reporting waste');

    // Create a notification for the user
    await createNotification(
      userId,
      `You've earned ${pointsEarned} points for reporting waste!`,
      'reward'
    );

    return report;
  } catch (error) {
    console.error("Error creating report:", error);
    return null;
  }
}

export async function getReportsByUserId(userId: number) {
  try {
    const reports = await db.select().from(Reports).where(eq(Reports.userId, userId)).execute();
    return reports;
  } catch (error) {
    console.error("Error fetching reports:", error);
    return [];
  }
}

export async function getOrCreateReward(userId: number) {
  try {
    let [reward] = await db.select().from(Rewards).where(eq(Rewards.userId, userId)).execute();
    if (!reward) {
      [reward] = await db.insert(Rewards).values({
        userId,
        name: 'Default Reward',
        collectionInfo: 'Default Collection Info',
        points: 0,
        level: 1,
        isAvailable: true,
      }).returning().execute();
    }
    return reward;
  } catch (error) {
    console.error("Error getting or creating reward:", error);
    return null;
  }
}

export async function updateRewardPoints(userId: number, pointsToAdd: number) {
  try {
    const [updatedReward] = await db
      .update(Rewards)
      .set({ 
        points: sql`${Rewards.points} + ${pointsToAdd}`,
        updatedAt: new Date()
      })
      .where(eq(Rewards.userId, userId))
      .returning()
      .execute();
    return updatedReward;
  } catch (error) {
    console.error("Error updating reward points:", error);
    return null;
  }
}

export async function createCollectedWaste(reportId: number, collectorId: number, notes?: string) {
  try {
    const [collectedWaste] = await db
      .insert(CollectedWastes)
      .values({
        reportId,
        collectorId,
        collectionDate: new Date(),
      })
      .returning()
      .execute();
    return collectedWaste;
  } catch (error) {
    console.error("Error creating collected waste:", error);
    return null;
  }
}

export async function getCollectedWastesByCollector(collectorId: number) {
  try {
    return await db.select().from(CollectedWastes).where(eq(CollectedWastes.collectorId, collectorId)).execute();
  } catch (error) {
    console.error("Error fetching collected wastes:", error);
    return [];
  }
}

export async function createNotification(userId: number, message: string, type: string) {
  try {
    const [notification] = await db
      .insert(Notifications)
      .values({ userId, message, type })
      .returning()
      .execute();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

export async function getUnreadNotifications(userId: number) {
  try {
    return await db.select().from(Notifications).where(
      and(
        eq(Notifications.userId, userId),
        eq(Notifications.isRead, false)
      )
    ).execute();
  } catch (error) {
    console.error("Error fetching unread notifications:", error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: number) {
  try {
    await db.update(Notifications).set({ isRead: true }).where(eq(Notifications.id, notificationId)).execute();
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
}

export async function getPendingReports() {
  try {
    return await db.select().from(Reports).where(eq(Reports.status, "pending")).execute();
  } catch (error) {
    console.error("Error fetching pending reports:", error);
    return [];
  }
}

export async function updateReportStatus(reportId: number, status: string) {
  try {
    const [updatedReport] = await db
      .update(Reports)
      .set({ status })
      .where(eq(Reports.id, reportId))
      .returning()
      .execute();
    return updatedReport;
  } catch (error) {
    console.error("Error updating report status:", error);
    return null;
  }
}

export async function getRecentReports(limit: number = 10) {
  try {
    const reports = await db
      .select()
      .from(Reports)
      .orderBy(desc(Reports.createdAt))
      .limit(limit)
      .execute();
    return reports;
  } catch (error) {
    console.error("Error fetching recent reports:", error);
    return [];
  }
}

export async function getWasteCollectionTasks(limit: number = 20) {
  try {
    const tasks = await db
      .select({
        id: Reports.id,
        location: Reports.location,
        wasteType: Reports.wasteType,
        amount: Reports.amount,
        status: Reports.status,
        date: Reports.createdAt,
        collectorId: Reports.collectorId,
      })
      .from(Reports)
      .limit(limit)
      .execute();

    return tasks.map(task => ({
      ...task,
      date: task.date.toISOString().split('T')[0], // Format date as YYYY-MM-DD
    }));
  } catch (error) {
    console.error("Error fetching waste collection tasks:", error);
    return [];
  }
}

export async function saveReward(userId: number, amount: number) {
  try {
    const [reward] = await db
      .insert(Rewards)
      .values({
        userId,
        name: 'Waste Collection Reward',
        collectionInfo: 'Points earned from waste collection',
        points: amount,
        level: 1,
        isAvailable: true,
      })
      .returning()
      .execute();
    
    // Create a transaction for this reward
    await createTransaction(userId, 'earned_collect', amount, 'Points earned for collecting waste');

    return reward;
  } catch (error) {
    console.error("Error saving reward:", error);
    throw error;
  }
}

export async function saveCollectedWaste(reportId: number, collectorId: number, verificationResult: any) {
  try {
    const [collectedWaste] = await db
      .insert(CollectedWastes)
      .values({
        reportId,
        collectorId,
        collectionDate: new Date(),
        status: 'verified',
      })
      .returning()
      .execute();
    return collectedWaste;
  } catch (error) {
    console.error("Error saving collected waste:", error);
    throw error;
  }
}

export async function updateTaskStatus(reportId: number, newStatus: string, collectorId?: number) {
  try {
    const updateData: any = { status: newStatus };
    if (collectorId !== undefined) {
      updateData.collectorId = collectorId;
    }
    const [updatedReport] = await db
      .update(Reports)
      .set(updateData)
      .where(eq(Reports.id, reportId))
      .returning()
      .execute();
    return updatedReport;
  } catch (error) {
    console.error("Error updating task status:", error);
    throw error;
  }
}

export async function getAllRewards() {
  try {
    const rewards = await db
      .select({
        id: Rewards.id,
        userId: Rewards.userId,
        points: Rewards.points,
        level: Rewards.level,
        createdAt: Rewards.createdAt,
        userName: Users.name,
      })
      .from(Rewards)
      .leftJoin(Users, eq(Rewards.userId, Users.id))
      .orderBy(desc(Rewards.points))
      .execute();

    return rewards;
  } catch (error) {
    console.error("Error fetching all rewards:", error);
    return [];
  }
}

export async function getRewardTransactions(userId: number) {
  try {
    console.log('Fetching transactions for user ID:', userId)
    const transactions = await db
      .select({
        id: Transactions.id,
        type: Transactions.type,
        amount: Transactions.amount,
        description: Transactions.description,
        date: Transactions.date,
      })
      .from(Transactions)
      .where(eq(Transactions.userId, userId))
      .orderBy(desc(Transactions.date))
      .limit(10)
      .execute();

    console.log('Raw transactions from database:', transactions)

    const formattedTransactions = transactions.map(t => ({
      ...t,
      date: t.date.toISOString().split('T')[0], // Format date as YYYY-MM-DD
    }));

    console.log('Formatted transactions:', formattedTransactions)
    return formattedTransactions;
  } catch (error) {
    console.error("Error fetching reward transactions:", error);
    return [];
  }
}

export async function getAvailableRewards(userId: number) {
  try {
    console.log('Fetching available rewards for user:', userId);
    
    // Get user's total points
    const userTransactions = await getRewardTransactions(userId);
    const userPoints = userTransactions.reduce((total, transaction) => {
      return transaction.type.startsWith('earned') ? total + transaction.amount : total - transaction.amount;
    }, 0);

    console.log('User total points:', userPoints);

    // Get available rewards from the database
    const dbRewards = await db
      .select({
        id: Rewards.id,
        name: Rewards.name,
        cost: Rewards.points,
        description: Rewards.description,
        collectionInfo: Rewards.collectionInfo,
      })
      .from(Rewards)
      .where(eq(Rewards.isAvailable, true))
      .execute();

    console.log('Rewards from database:', dbRewards);

    // Combine user points and database rewards
    const allRewards = [
      {
        id: 0, // Use a special ID for user's points
        name: "Your Points",
        cost: userPoints,
        description: "Redeem your earned points",
        collectionInfo: "Points earned from reporting and collecting waste"
      },
      ...dbRewards
    ];

    console.log('All available rewards:', allRewards);
    return allRewards;
  } catch (error) {
    console.error("Error fetching available rewards:", error);
    return [];
  }
}

export async function createTransaction(userId: number, type: 'earned_report' | 'earned_collect' | 'redeemed', amount: number, description: string) {
  try {
    const [transaction] = await db
      .insert(Transactions)
      .values({ userId, type, amount, description })
      .returning()
      .execute();
    return transaction;
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw error;
  }
}

export async function redeemReward(userId: number, rewardId: number) {
  try {
    const userReward = await getOrCreateReward(userId) as any;
    
    if (rewardId === 0) {
      // Redeem all points
      const [updatedReward] = await db.update(Rewards)
        .set({ 
          points: 0,
          updatedAt: new Date(),
        })
        .where(eq(Rewards.userId, userId))
        .returning()
        .execute();

      // Create a transaction for this redemption
      await createTransaction(userId, 'redeemed', userReward.points, `Redeemed all points: ${userReward.points}`);

      return updatedReward;
    } else {
      // Existing logic for redeeming specific rewards
      const availableReward = await db.select().from(Rewards).where(eq(Rewards.id, rewardId)).execute();

      if (!userReward || !availableReward[0] || userReward.points < availableReward[0].points) {
        throw new Error("Insufficient points or invalid reward");
      }

      const [updatedReward] = await db.update(Rewards)
        .set({ 
          points: sql`${Rewards.points} - ${availableReward[0].points}`,
          updatedAt: new Date(),
        })
        .where(eq(Rewards.userId, userId))
        .returning()
        .execute();

      // Create a transaction for this redemption
      await createTransaction(userId, 'redeemed', availableReward[0].points, `Redeemed: ${availableReward[0].name}`);

      return updatedReward;
    }
  } catch (error) {
    console.error("Error redeeming reward:", error);
    throw error;
  }
}

export async function getUserBalance(userId: number): Promise<number> {
  const transactions = await getRewardTransactions(userId);
  const balance = transactions.reduce((acc, transaction) => {
    return transaction.type.startsWith('earned') ? acc + transaction.amount : acc - transaction.amount
  }, 0);
  return Math.max(balance, 0); // Ensure balance is never negative
}

// ==================== Carbon Tracking Functions ====================

// Get or create carbon activities (seed default activities)
export async function getCarbonActivities() {
  try {
    const activities = await db.select().from(CarbonActivities).execute();
    return activities;
  } catch (error) {
    console.error("Error fetching carbon activities:", error);
    return [];
  }
}

// Seed default carbon activities if none exist
export async function seedCarbonActivities() {
  try {
    const existingActivities = await db.select().from(CarbonActivities).limit(1).execute();
    if (existingActivities.length > 0) {
      return { success: true, message: "Activities already seeded" };
    }

    // Default activities - same as in carbonCalculations.ts
    const defaultActivities = [
      { category: 'transport', activityName: 'Car (petrol)', emissionFactor: 192, unit: 'km', description: 'Average petrol car emissions per kilometer' },
      { category: 'transport', activityName: 'Car (diesel)', emissionFactor: 171, unit: 'km', description: 'Average diesel car emissions per kilometer' },
      { category: 'transport', activityName: 'Car (electric)', emissionFactor: 53, unit: 'km', description: 'Average electric car emissions per kilometer' },
      { category: 'transport', activityName: 'Bus', emissionFactor: 89, unit: 'km', description: 'Public bus emissions per kilometer' },
      { category: 'transport', activityName: 'Train', emissionFactor: 41, unit: 'km', description: 'Train emissions per kilometer' },
      { category: 'transport', activityName: 'Motorcycle', emissionFactor: 103, unit: 'km', description: 'Motorcycle emissions per kilometer' },
      { category: 'transport', activityName: 'Bicycle', emissionFactor: 0, unit: 'km', description: 'Zero emissions' },
      { category: 'transport', activityName: 'Walking', emissionFactor: 0, unit: 'km', description: 'Zero emissions' },
      { category: 'food', activityName: 'Beef', emissionFactor: 27000, unit: 'kg', description: 'Beef production emissions per kg' },
      { category: 'food', activityName: 'Chicken', emissionFactor: 6900, unit: 'kg', description: 'Chicken production emissions per kg' },
      { category: 'food', activityName: 'Fish', emissionFactor: 5000, unit: 'kg', description: 'Fish production emissions per kg' },
      { category: 'food', activityName: 'Vegetables', emissionFactor: 500, unit: 'kg', description: 'Average vegetable production emissions per kg' },
      { category: 'food', activityName: 'Plant-based meal', emissionFactor: 1500, unit: 'meal', description: 'Average plant-based meal emissions' },
      { category: 'energy', activityName: 'Electricity (grid)', emissionFactor: 475, unit: 'kwh', description: 'Grid electricity emissions per kWh' },
      { category: 'energy', activityName: 'Natural gas', emissionFactor: 202, unit: 'kwh', description: 'Natural gas emissions per kWh' },
      { category: 'shopping', activityName: 'New clothing', emissionFactor: 5000, unit: 'item', description: 'Average garment emissions' },
      { category: 'shopping', activityName: 'Electronics', emissionFactor: 50000, unit: 'item', description: 'Average electronics device emissions' },
      { category: 'shopping', activityName: 'Second-hand item', emissionFactor: 500, unit: 'item', description: 'Reduced emissions from reuse' },
    ];

    await db.insert(CarbonActivities).values(defaultActivities).execute();
    return { success: true, message: "Default activities seeded successfully" };
  } catch (error) {
    console.error("Error seeding carbon activities:", error);
    return { success: false, message: "Failed to seed activities" };
  }
}

// Log a carbon activity
export async function logCarbonActivity(
  userId: number,
  activityId: number,
  quantity: number,
  carbonEmitted: number,
  notes?: string
) {
  try {
    const [log] = await db
      .insert(DailyLogs)
      .values({
        userId,
        activityId,
        quantity,
        carbonEmitted,
        notes: notes || null,
      })
      .returning()
      .execute();
    return log;
  } catch (error) {
    console.error("Error logging carbon activity:", error);
    return null;
  }
}

// Get user's daily carbon footprint
export async function getDailyCarbonFootprint(userId: number, date?: Date) {
  try {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const logs = await db
      .select({
        id: DailyLogs.id,
        activityId: DailyLogs.activityId,
        quantity: DailyLogs.quantity,
        carbonEmitted: DailyLogs.carbonEmitted,
        date: DailyLogs.date,
        notes: DailyLogs.notes,
        activityName: CarbonActivities.activityName,
        category: CarbonActivities.category,
        unit: CarbonActivities.unit,
      })
      .from(DailyLogs)
      .leftJoin(CarbonActivities, eq(DailyLogs.activityId, CarbonActivities.id))
      .where(
        and(
          eq(DailyLogs.userId, userId),
          gte(DailyLogs.date, startOfDay),
          lte(DailyLogs.date, endOfDay)
        )
      )
      .orderBy(desc(DailyLogs.date))
      .execute();

    const totalEmissions = logs.reduce((sum, log) => sum + log.carbonEmitted, 0);
    
    return {
      logs,
      totalEmissions,
      date: targetDate.toISOString().split('T')[0],
    };
  } catch (error) {
    console.error("Error fetching daily carbon footprint:", error);
    return { logs: [], totalEmissions: 0, date: new Date().toISOString().split('T')[0] };
  }
}

// Get weekly carbon trends
export async function getWeeklyCarbonTrends(userId: number) {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const logs = await db
      .select({
        carbonEmitted: DailyLogs.carbonEmitted,
        date: DailyLogs.date,
        category: CarbonActivities.category,
      })
      .from(DailyLogs)
      .leftJoin(CarbonActivities, eq(DailyLogs.activityId, CarbonActivities.id))
      .where(
        and(
          eq(DailyLogs.userId, userId),
          gte(DailyLogs.date, sevenDaysAgo)
        )
      )
      .execute();

    // Group by date
    const dailyTotals = logs.reduce((acc, log) => {
      const dateKey = new Date(log.date).toISOString().split('T')[0];
      acc[dateKey] = (acc[dateKey] || 0) + log.carbonEmitted;
      return acc;
    }, {} as Record<string, number>);

    // Group by category
    const categoryTotals = logs.reduce((acc, log) => {
      if (log.category) {
        acc[log.category] = (acc[log.category] || 0) + log.carbonEmitted;
      }
      return acc;
    }, {} as Record<string, number>);

    const totalEmissions = logs.reduce((sum, log) => sum + log.carbonEmitted, 0);
    const avgDaily = logs.length > 0 ? totalEmissions / 7 : 0;

    return {
      dailyTotals,
      categoryTotals,
      totalEmissions,
      avgDaily: Math.round(avgDaily),
      daysLogged: Object.keys(dailyTotals).length,
    };
  } catch (error) {
    console.error("Error fetching weekly carbon trends:", error);
    return {
      dailyTotals: {},
      categoryTotals: {},
      totalEmissions: 0,
      avgDaily: 0,
      daysLogged: 0,
    };
  }
}

// Get total carbon offset from waste collection for a user
export async function getUserCarbonOffset(userId: number) {
  try {
    const collectedWastes = await db
      .select({
        amount: Reports.amount,
      })
      .from(CollectedWastes)
      .leftJoin(Reports, eq(CollectedWastes.reportId, Reports.id))
      .where(eq(CollectedWastes.collectorId, userId))
      .execute();

    let totalOffset = 0;
    collectedWastes.forEach(waste => {
      if (waste.amount) {
        const match = waste.amount.match(/(\d+(\.\d+)?)/);
        const amount = match ? parseFloat(match[0]) : 0;
        totalOffset += amount * 500; // 500g CO2 per kg of waste
      }
    });

    return Math.round(totalOffset);
  } catch (error) {
    console.error("Error calculating carbon offset:", error);
    return 0;
  }
}

// ==================== Receipt Scanning Functions ====================

// Save a scanned receipt
export async function saveReceiptScan(
  userId: number,
  imageUrl: string,
  storeName: string,
  purchaseDate: string,
  totalAmount: string,
  totalCarbon: number,
  itemCount: number,
  aiAnalysis: any
) {
  try {
    const [receipt] = await db
      .insert(ReceiptScans)
      .values({
        userId,
        imageUrl,
        storeName,
        purchaseDate: new Date(purchaseDate),
        totalAmount,
        totalCarbon,
        itemCount,
        status: 'processed',
        aiAnalysis,
      })
      .returning()
      .execute();

    // Update user profile
    await updateUserProfile(userId, totalCarbon, 1);

    // Award points for scanning (10 points + 1 point per kg CO2 tracked)
    const pointsEarned = 10 + Math.floor(totalCarbon / 1000);
    await updateRewardPoints(userId, pointsEarned);
    await createTransaction(userId, 'earned_report', pointsEarned, `Points earned for scanning receipt (${itemCount} items)`);

    return receipt;
  } catch (error) {
    console.error("Error saving receipt scan:", error);
    return null;
  }
}

// Save scanned items for a receipt
export async function saveScannedItems(receiptId: number, items: Array<{
  itemName: string;
  category: string;
  quantity: number;
  price?: string;
  carbonEmission: number;
  confidence: number;
}>) {
  try {
    const itemsToInsert = items.map(item => ({
      receiptId,
      itemName: item.itemName,
      category: item.category,
      quantity: item.quantity,
      price: item.price || null,
      carbonEmission: item.carbonEmission,
      confidence: item.confidence,
    }));

    const insertedItems = await db
      .insert(ScannedItems)
      .values(itemsToInsert)
      .returning()
      .execute();

    return insertedItems;
  } catch (error) {
    console.error("Error saving scanned items:", error);
    return [];
  }
}

// Get user's receipt scan history
export async function getUserReceiptScans(userId: number, limit: number = 20) {
  try {
    const receipts = await db
      .select()
      .from(ReceiptScans)
      .where(eq(ReceiptScans.userId, userId))
      .orderBy(desc(ReceiptScans.createdAt))
      .limit(limit)
      .execute();

    return receipts;
  } catch (error) {
    console.error("Error fetching receipt scans:", error);
    return [];
  }
}

// Get items for a specific receipt
export async function getReceiptItems(receiptId: number) {
  try {
    const items = await db
      .select()
      .from(ScannedItems)
      .where(eq(ScannedItems.receiptId, receiptId))
      .execute();

    return items;
  } catch (error) {
    console.error("Error fetching receipt items:", error);
    return [];
  }
}

// Get receipt scanning statistics for a user
export async function getUserReceiptStats(userId: number) {
  try {
    const receipts = await db
      .select()
      .from(ReceiptScans)
      .where(eq(ReceiptScans.userId, userId))
      .execute();

    const totalScans = receipts.length;
    const totalCarbon = receipts.reduce((sum, r) => sum + r.totalCarbon, 0);
    const totalItems = receipts.reduce((sum, r) => sum + (r.itemCount || 0), 0);

    // Category breakdown
    const allItems = await db
      .select({
        category: ScannedItems.category,
        carbonEmission: ScannedItems.carbonEmission,
      })
      .from(ScannedItems)
      .leftJoin(ReceiptScans, eq(ScannedItems.receiptId, ReceiptScans.id))
      .where(eq(ReceiptScans.userId, userId))
      .execute();

    const categoryTotals = allItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.carbonEmission;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalScans,
      totalCarbon,
      totalItems,
      categoryTotals,
    };
  } catch (error) {
    console.error("Error fetching receipt stats:", error);
    return {
      totalScans: 0,
      totalCarbon: 0,
      totalItems: 0,
      categoryTotals: {},
    };
  }
}

// ==================== User Profile Functions ====================

// Get or create user profile
export async function getOrCreateUserProfile(userId: number) {
  try {
    let [profile] = await db
      .select()
      .from(UserProfiles)
      .where(eq(UserProfiles.userId, userId))
      .execute();

    if (!profile) {
      [profile] = await db
        .insert(UserProfiles)
        .values({
          userId,
          totalCarbonTracked: 0,
          receiptsScanned: 0,
          ecoScore: 0,
          streak: 0,
        })
        .returning()
        .execute();
    }

    return profile;
  } catch (error) {
    console.error("Error getting or creating user profile:", error);
    return null;
  }
}

// Update user profile after scanning
async function updateUserProfile(userId: number, carbonAdded: number, receiptsAdded: number) {
  try {
    await db
      .update(UserProfiles)
      .set({
        totalCarbonTracked: sql`${UserProfiles.totalCarbonTracked} + ${carbonAdded}`,
        receiptsScanned: sql`${UserProfiles.receiptsScanned} + ${receiptsAdded}`,
        ecoScore: sql`${UserProfiles.ecoScore} + ${Math.floor(carbonAdded / 1000)}`,
        lastActivityDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(UserProfiles.userId, userId))
      .execute();

    // Update streak logic
    await updateUserStreak(userId);
  } catch (error) {
    console.error("Error updating user profile:", error);
  }
}

// Update user streak
async function updateUserStreak(userId: number) {
  try {
    const profile = await getOrCreateUserProfile(userId);
    if (!profile) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastActivity = profile.lastActivityDate ? new Date(profile.lastActivityDate) : null;
    if (lastActivity) {
      lastActivity.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        // Consecutive day - increment streak
        await db
          .update(UserProfiles)
          .set({ streak: sql`${UserProfiles.streak} + 1` })
          .where(eq(UserProfiles.userId, userId))
          .execute();
      } else if (daysDiff > 1) {
        // Streak broken - reset to 1
        await db
          .update(UserProfiles)
          .set({ streak: 1 })
          .where(eq(UserProfiles.userId, userId))
          .execute();
      }
    } else {
      // First activity - start streak
      await db
        .update(UserProfiles)
        .set({ streak: 1 })
        .where(eq(UserProfiles.userId, userId))
        .execute();
    }
  } catch (error) {
    console.error("Error updating user streak:", error);
  }
}

// ==================== Campus Groups Functions ====================

// Get all campus groups
export async function getAllCampusGroups() {
  try {
    const groups = await db
      .select()
      .from(CampusGroups)
      .orderBy(CampusGroups.name)
      .execute();

    return groups;
  } catch (error) {
    console.error("Error fetching campus groups:", error);
    return [];
  }
}

// Create campus group
export async function createCampusGroup(name: string, type: 'dorm' | 'department', description?: string) {
  try {
    const [group] = await db
      .insert(CampusGroups)
      .values({
        name,
        type,
        description: description || null,
        memberCount: 0,
        totalCarbonTracked: 0,
      })
      .returning()
      .execute();

    return group;
  } catch (error) {
    console.error("Error creating campus group:", error);
    return null;
  }
}

// Join campus group
export async function joinCampusGroup(userId: number, groupId: number) {
  try {
    // Update user's campus group
    await db
      .update(Users)
      .set({ campusGroupId: groupId })
      .where(eq(Users.id, userId))
      .execute();

    // Increment group member count
    await db
      .update(CampusGroups)
      .set({ memberCount: sql`${CampusGroups.memberCount} + 1` })
      .where(eq(CampusGroups.id, groupId))
      .execute();

    return true;
  } catch (error) {
    console.error("Error joining campus group:", error);
    return false;
  }
}

// Get campus group leaderboard
export async function getCampusGroupLeaderboard() {
  try {
    const groups = await db
      .select()
      .from(CampusGroups)
      .orderBy(desc(CampusGroups.totalCarbonTracked))
      .execute();

    return groups;
  } catch (error) {
    console.error("Error fetching campus group leaderboard:", error);
    return [];
  }
}

// Update campus group total carbon
export async function updateCampusGroupCarbon(groupId: number, carbonAdded: number) {
  try {
    await db
      .update(CampusGroups)
      .set({
        totalCarbonTracked: sql`${CampusGroups.totalCarbonTracked} + ${carbonAdded}`,
      })
      .where(eq(CampusGroups.id, groupId))
      .execute();
  } catch (error) {
    console.error("Error updating campus group carbon:", error);
  }
}