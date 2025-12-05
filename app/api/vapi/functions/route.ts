import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/utils/db/dbConfig';
import { DailyLogs, Users, Rewards, UserProfiles, VoiceConversations } from '@/utils/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

// Helper to format carbon amount
function formatCarbon(grams: number): string {
  if (grams < 1000) {
    return `${grams}g`;
  }
  return `${(grams / 1000).toFixed(2)}kg`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('VAPI webhook received:', JSON.stringify(body, null, 2));

    // VAPI sends different message types
    const { message } = body;
    
    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    // Handle function calls from VAPI
    if (message.type === 'function-call') {
      const { functionCall } = message;
      
      if (!functionCall) {
        return NextResponse.json({ error: 'No function call in message' }, { status: 400 });
      }

      const { name, parameters } = functionCall;
      
      // Get user ID from custom data passed by VAPI
      const userId = body.call?.assistantOverrides?.metadata?.userId;
      
      if (!userId) {
        return NextResponse.json({
          result: "I couldn't identify your account. Please make sure you're signed in and try again."
        });
      }

      console.log(`Function called: ${name} with params:`, parameters);

      switch (name) {
        case 'logCarbonActivity':
          return await handleLogActivity(parseInt(userId), parameters);
        
        case 'getDailySummary':
          return await handleGetDailySummary(parseInt(userId));
        
        case 'getWeeklySummary':
          return await handleGetWeeklySummary(parseInt(userId));
        
        case 'getLeaderboardPosition':
          return await handleGetLeaderboard(parseInt(userId));
        
        case 'setReminder':
          return await handleSetReminder(parseInt(userId), parameters);
        
        default:
          return NextResponse.json({
            result: `I'm not sure how to handle that request. Try asking me to log an activity or check your progress!`
          });
      }
    }

    // Handle assistant request (for server URL configuration)
    if (message.type === 'assistant-request') {
      return NextResponse.json({
        assistant: {
          // Return assistant configuration if needed
        }
      });
    }

    // Handle end-of-call report
    if (message.type === 'end-of-call-report') {
      const { call, summary, transcript } = message;
      const userId = call?.assistantOverrides?.metadata?.userId;
      
      if (userId) {
        // Log the conversation
        await db.insert(VoiceConversations).values({
          userId: parseInt(userId),
          transcript: transcript || summary,
          duration: call?.duration || 0,
        }).execute();
      }
      
      return NextResponse.json({ success: true });
    }

    // Default response for other message types
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('VAPI function error:', error);
    return NextResponse.json({ 
      result: "Oops, something went wrong on my end. Try again in a moment!" 
    }, { status: 500 });
  }
}

// Function handlers

interface LogActivityParams {
  category: string;
  activityType: string;
  quantity: number;
  carbonEmitted: number;
  unit?: string;
  description?: string;
}

async function handleLogActivity(userId: number, params: LogActivityParams) {
  try {
    const { category, activityType, quantity, carbonEmitted, unit, description } = params;
    
    // Insert the activity
    const [newLog] = await db.insert(DailyLogs).values({
      userId,
      quantity: Math.round(quantity),
      carbonEmitted: Math.round(carbonEmitted),
      source: 'voice',
      category,
      activityType,
      unit: unit || 'units',
      notes: description || `${quantity} ${activityType} logged via voice`,
    }).returning().execute();

    // Update user profile stats
    await db
      .update(UserProfiles)
      .set({
        totalCarbonTracked: sql`${UserProfiles.totalCarbonTracked} + ${Math.round(carbonEmitted)}`,
        lastActivityDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(UserProfiles.userId, userId))
      .execute();

    // Award points (5 points + 1 per kg)
    const pointsEarned = 5 + Math.floor(carbonEmitted / 1000);
    await db
      .update(Rewards)
      .set({
        points: sql`${Rewards.points} + ${pointsEarned}`,
        updatedAt: new Date(),
      })
      .where(eq(Rewards.userId, userId))
      .execute();

    return NextResponse.json({
      result: {
        success: true,
        activityId: newLog.id,
        carbonEmitted: carbonEmitted,
        carbonFormatted: formatCarbon(carbonEmitted),
        pointsEarned,
        message: `Logged! ${quantity} ${activityType} = ${formatCarbon(carbonEmitted)} CO₂. You earned ${pointsEarned} points!`
      }
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    return NextResponse.json({
      result: "I had trouble saving that activity. Could you try again?"
    });
  }
}

async function handleGetDailySummary(userId: number) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const activities = await db
      .select()
      .from(DailyLogs)
      .where(
        and(
          eq(DailyLogs.userId, userId),
          gte(DailyLogs.date, today),
          lte(DailyLogs.date, endOfDay)
        )
      )
      .orderBy(desc(DailyLogs.date))
      .execute();

    const totalCarbon = activities.reduce((sum, act) => sum + act.carbonEmitted, 0);
    const activityCount = activities.length;

    // Get category breakdown
    const categoryBreakdown = activities.reduce((acc, act) => {
      const cat = act.category || 'other';
      acc[cat] = (acc[cat] || 0) + act.carbonEmitted;
      return acc;
    }, {} as Record<string, number>);

    // Find highest category
    const highestCategory = Object.entries(categoryBreakdown)
      .sort((a, b) => b[1] - a[1])[0];

    let message = '';
    if (activityCount === 0) {
      message = "You haven't logged anything today yet. Tell me about your day - any car rides, meals, or purchases?";
    } else {
      message = `Today you've logged ${activityCount} activities totaling ${formatCarbon(totalCarbon)} of CO₂. `;
      if (highestCategory) {
        message += `Your biggest category was ${highestCategory[0]} at ${formatCarbon(highestCategory[1])}. `;
      }
      if (totalCarbon < 5000) {
        message += "That's really low - great job keeping it green!";
      } else if (totalCarbon < 10000) {
        message += "Not bad at all!";
      } else {
        message += "See any areas you could cut back?";
      }
    }

    return NextResponse.json({
      result: {
        totalCarbon,
        totalCarbonFormatted: formatCarbon(totalCarbon),
        activityCount,
        categoryBreakdown,
        message
      }
    });
  } catch (error) {
    console.error('Error getting daily summary:', error);
    return NextResponse.json({
      result: "I couldn't fetch your daily summary right now. Try again in a moment!"
    });
  }
}

async function handleGetWeeklySummary(userId: number) {
  try {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    const activities = await db
      .select()
      .from(DailyLogs)
      .where(
        and(
          eq(DailyLogs.userId, userId),
          gte(DailyLogs.date, weekAgo)
        )
      )
      .execute();

    const totalCarbon = activities.reduce((sum, act) => sum + act.carbonEmitted, 0);
    const avgDaily = totalCarbon / 7;

    // Group by day
    const dailyTotals = activities.reduce((acc, act) => {
      const dateKey = new Date(act.date).toISOString().split('T')[0];
      acc[dateKey] = (acc[dateKey] || 0) + act.carbonEmitted;
      return acc;
    }, {} as Record<string, number>);

    const daysLogged = Object.keys(dailyTotals).length;

    // Find best day
    const bestDay = Object.entries(dailyTotals)
      .sort((a, b) => a[1] - b[1])[0];

    let message = `This week you've tracked ${formatCarbon(totalCarbon)} of CO₂ across ${daysLogged} days. `;
    message += `That's an average of ${formatCarbon(avgDaily)} per day. `;
    
    if (bestDay) {
      const dayName = new Date(bestDay[0]).toLocaleDateString('en-US', { weekday: 'long' });
      message += `Your greenest day was ${dayName} with only ${formatCarbon(bestDay[1])}!`;
    }

    return NextResponse.json({
      result: {
        totalCarbon,
        totalCarbonFormatted: formatCarbon(totalCarbon),
        avgDaily: formatCarbon(avgDaily),
        daysLogged,
        dailyTotals,
        message
      }
    });
  } catch (error) {
    console.error('Error getting weekly summary:', error);
    return NextResponse.json({
      result: "I couldn't fetch your weekly summary right now. Try again!"
    });
  }
}

async function handleGetLeaderboard(userId: number) {
  try {
    // Get all users with rewards
    const leaderboard = await db
      .select({
        id: Users.id,
        name: Users.name,
        points: Rewards.points,
      })
      .from(Users)
      .leftJoin(Rewards, eq(Users.id, Rewards.userId))
      .orderBy(desc(Rewards.points))
      .execute();

    const userPosition = leaderboard.findIndex(u => u.id === userId) + 1;
    const userEntry = leaderboard.find(u => u.id === userId);
    const userPoints = userEntry?.points || 0;
    const totalUsers = leaderboard.length;

    // Check who's above the user
    let nearbyUsers = '';
    if (userPosition > 1 && leaderboard[userPosition - 2]) {
      const above = leaderboard[userPosition - 2];
      const pointsNeeded = (above.points || 0) - userPoints;
      nearbyUsers = `You're only ${pointsNeeded} points behind #${userPosition - 1}!`;
    }

    let message = '';
    if (userPosition <= 3) {
      message = `Amazing! You're #${userPosition} on the leaderboard with ${userPoints} points! You're in the top 3! 🏆`;
    } else if (userPosition <= 10) {
      message = `You're #${userPosition} out of ${totalUsers} students with ${userPoints} points! Top 10 is within reach! ${nearbyUsers}`;
    } else {
      message = `You're #${userPosition} out of ${totalUsers} students with ${userPoints} points. ${nearbyUsers} Keep logging to climb up!`;
    }

    return NextResponse.json({
      result: {
        position: userPosition,
        points: userPoints,
        totalUsers,
        message
      }
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return NextResponse.json({
      result: "I couldn't check the leaderboard right now. Try again!"
    });
  }
}

interface SetReminderParams {
  reminderText: string;
  timeDescription?: string;
}

async function handleSetReminder(_userId: number, params: SetReminderParams) {
  const { reminderText, timeDescription } = params;
  
  // For now, just acknowledge the reminder
  // In a full implementation, you'd store this and set up a notification
  return NextResponse.json({
    result: {
      success: true,
      message: `Got it! I'll remind you to "${reminderText}" ${timeDescription || 'soon'}. Just a heads up - reminders are coming in a future update, but I've noted this down!`
    }
  });
}

// Allow GET for health checks
export async function GET() {
  return NextResponse.json({ status: 'VAPI functions endpoint ready' });
}
