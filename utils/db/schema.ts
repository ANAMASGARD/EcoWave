import { integer, varchar, pgTable, serial, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

// Users table
export const Users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  campusGroupId: integer("campus_group_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Campus Groups - Dorms/Departments for leaderboard groupings
export const CampusGroups = pgTable("campus_groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'dorm' or 'department'
  description: text("description"),
  memberCount: integer("member_count").default(0),
  totalCarbonTracked: integer("total_carbon_tracked").default(0), // in grams
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Profiles - Extended user data
export const UserProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => Users.id).notNull().unique(),
  totalCarbonTracked: integer("total_carbon_tracked").default(0), // in grams
  receiptsScanned: integer("receipts_scanned").default(0),
  ecoScore: integer("eco_score").default(0),
  weeklyGoal: integer("weekly_goal").default(10000), // weekly carbon goal in grams
  streak: integer("streak").default(0), // consecutive days of logging
  lastActivityDate: timestamp("last_activity_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Reports table
export const Reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => Users.id).notNull(),
  location: text("location").notNull(),
  wasteType: varchar("waste_type", { length: 255 }).notNull(),
  amount: varchar("amount", { length: 255 }).notNull(),
  imageUrl: text("image_url"),
  verificationResult: jsonb("verification_result"),
  status: varchar("status", { length: 255 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  collectorId: integer("collector_id").references(() => Users.id),
});

// Rewards table
export const Rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => Users.id).notNull(),
  points: integer("points").notNull().default(0),
  level: integer("level").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  description: text("description"),
  name: varchar("name", { length: 255 }).notNull(),
  collectionInfo: text("collection_info").notNull(),
});

// CollectedWastes table
export const CollectedWastes = pgTable("collected_wastes", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => Reports.id).notNull(),
  collectorId: integer("collector_id").references(() => Users.id).notNull(),
  collectionDate: timestamp("collection_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("collected"),
});

// Notifications table
export const Notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => Users.id).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New Transactions table
export const Transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => Users.id).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'earned' or 'redeemed'
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

// Carbon Activities - predefined activity categories with emission factors
export const CarbonActivities = pgTable("carbon_activities", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 50 }).notNull(), // transport, food, energy, shopping
  activityName: varchar("activity_name", { length: 255 }).notNull(),
  emissionFactor: integer("emission_factor").notNull(), // CO2 in grams per unit
  unit: varchar("unit", { length: 50 }).notNull(), // km, kwh, kg, item
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Daily Logs - track user's daily carbon-emitting activities
export const DailyLogs = pgTable("daily_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => Users.id).notNull(),
  activityId: integer("activity_id").references(() => CarbonActivities.id),
  quantity: integer("quantity").notNull(), // amount of activity (e.g., 10 km, 5 kwh)
  carbonEmitted: integer("carbon_emitted").notNull(), // calculated CO2 in grams
  date: timestamp("date").defaultNow().notNull(),
  notes: text("notes"),
  source: varchar("source", { length: 20 }).default("manual"), // 'manual', 'voice', 'scan'
  category: varchar("category", { length: 50 }), // transport, food, energy, shopping
  activityType: varchar("activity_type", { length: 100 }), // specific activity (car, bus, beef, etc.)
  unit: varchar("unit", { length: 20 }), // km, kg, kWh, items
});

// Voice Conversations - track voice assistant interactions
export const VoiceConversations = pgTable("voice_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => Users.id).notNull(),
  transcript: text("transcript"), // what the user said
  response: text("response"), // what the AI responded
  functionCalled: varchar("function_called", { length: 100 }), // which function was triggered
  duration: integer("duration"), // call duration in seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Receipt Scans - Store scanned receipt data
export const ReceiptScans = pgTable("receipt_scans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => Users.id).notNull(),
  imageUrl: text("image_url"), // base64 or cloud storage URL
  storeName: varchar("store_name", { length: 255 }),
  purchaseDate: timestamp("purchase_date"),
  totalAmount: varchar("total_amount", { length: 50 }),
  totalCarbon: integer("total_carbon").notNull(), // total CO2 in grams
  itemCount: integer("item_count").default(0),
  status: varchar("status", { length: 50 }).default("processed"), // processed, pending, error
  aiAnalysis: jsonb("ai_analysis"), // raw AI response
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Scanned Items - Individual items from receipts
export const ScannedItems = pgTable("scanned_items", {
  id: serial("id").primaryKey(),
  receiptId: integer("receipt_id").references(() => ReceiptScans.id).notNull(),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // electronics, clothing, food, etc.
  quantity: integer("quantity").default(1),
  price: varchar("price", { length: 50 }),
  carbonEmission: integer("carbon_emission").notNull(), // CO2 in grams per item
  confidence: integer("confidence").default(80), // AI confidence level 0-100
  createdAt: timestamp("created_at").defaultNow().notNull(),
});