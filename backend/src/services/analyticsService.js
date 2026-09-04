import Cloth from '../models/Cloth.js'
import WearLog from '../models/WearLog.js'
import Outfit from '../models/Outfit.js'
import ItemPreference from '../models/ItemPreference.js'
import mongoose from 'mongoose'

// ─────────────────────────────────────────────
// Cost per wear analytics
// The ROI dashboard feature
// ─────────────────────────────────────────────

export async function getCostPerWearAnalytics(userId) {
  const uid = new mongoose.Types.ObjectId(userId)

  const items = await Cloth.find({
    userId:        uid,
    isArchived:    false,
    purchasePrice: { $exists: true, $ne: null },
  })
    .select('name subCategory category color purchasePrice wearCount costPerWear imageUrl brand')
    .sort({ costPerWear: 1 })
    .lean()

  const withCPW = items.map(item => ({
    ...item,
    costPerWear: item.wearCount > 0
      ? parseFloat((item.purchasePrice / item.wearCount).toFixed(2))
      : item.purchasePrice, // never worn = full price per wear
    wearCount: item.wearCount || 0,
  }))

  return {
    items:      withCPW,
    bestValue:  withCPW.slice(0, 5),   // lowest cost per wear
    worstValue: withCPW.slice(-5).reverse(), // highest cost per wear
    summary: {
      totalItems:         items.length,
      avgCostPerWear:     items.length > 0
        ? parseFloat(
            (withCPW.reduce((s, i) => s + (i.costPerWear || 0), 0) / items.length).toFixed(2)
          )
        : 0,
      totalSpend: items.reduce((s, i) => s + (i.purchasePrice || 0), 0),
    },
  }
}

// ─────────────────────────────────────────────
// Most and least worn items
// ─────────────────────────────────────────────

export async function getWearFrequency(userId, limit = 10) {
  const uid = new mongoose.Types.ObjectId(userId)

  const [mostWorn, leastWorn, neverWorn] = await Promise.all([
    // Most worn
    Cloth.find({ userId: uid, isArchived: false, wearCount: { $gt: 0 } })
      .select('name subCategory category color wearCount lastWornAt imageUrl')
      .sort({ wearCount: -1 })
      .limit(limit)
      .lean(),

    // Least worn (but at least once)
    Cloth.find({ userId: uid, isArchived: false, wearCount: { $gt: 0 } })
      .select('name subCategory category color wearCount lastWornAt imageUrl')
      .sort({ wearCount: 1 })
      .limit(limit)
      .lean(),

    // Never worn
    Cloth.find({ userId: uid, isArchived: false, wearCount: 0 })
      .select('name subCategory category color createdAt imageUrl')
      .sort({ createdAt: -1 })
      .lean(),
  ])

  return { mostWorn, leastWorn, neverWorn }
}

// ─────────────────────────────────────────────
// Sleeping items — haven't been worn in 60+ days
// but exist in wardrobe (the "unworn 80%")
// ─────────────────────────────────────────────

export async function getSleepingItems(userId) {
  const uid       = new mongoose.Types.ObjectId(userId)
  const threshold = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

  const sleeping = await Cloth.find({
    userId:     uid,
    isArchived: false,
    $or: [
      { lastWornAt: { $lt: threshold } },
      { lastWornAt: { $exists: false }, createdAt: { $lt: threshold } },
    ],
  })
    .select('name subCategory category color wearCount lastWornAt imageUrl purchasePrice createdAt')
    .sort({ lastWornAt: 1 })
    .lean()

  return {
    items: sleeping,
    count: sleeping.length,
    tip:   sleeping.length > 5
      ? `You have ${sleeping.length} items that haven\'t been worn in 60+ days. Consider featuring them in upcoming outfit plans.`
      : null,
  }
}

// ─────────────────────────────────────────────
// Overall wardrobe utilization
// What % of wardrobe is actively used
// ─────────────────────────────────────────────

export async function getWardrobeUtilization(userId) {
  const uid = new mongoose.Types.ObjectId(userId)

  const [total, worn, wornThisMonth, totalValue] = await Promise.all([
    Cloth.countDocuments({ userId: uid, isArchived: false }),

    Cloth.countDocuments({ userId: uid, isArchived: false, wearCount: { $gt: 0 } }),

    Cloth.countDocuments({
      userId:     uid,
      isArchived: false,
      lastWornAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }),

    Cloth.aggregate([
      {
        $match: {
          userId:        uid,
          isArchived:    false,
          purchasePrice: { $exists: true, $ne: null },
        },
      },
      { $group: { _id: null, total: { $sum: '$purchasePrice' } } },
    ]),
  ])

  return {
    totalItems:           total,
    everWorn:             worn,
    neverWorn:            total - worn,
    wornThisMonth,
    utilizationRate:      total > 0 ? parseFloat(((worn / total) * 100).toFixed(1)) : 0,
    monthlyActiveRate:    total > 0 ? parseFloat(((wornThisMonth / total) * 100).toFixed(1)) : 0,
    totalWardrobeValue:   totalValue[0]?.total || 0,
  }
}

// ─────────────────────────────────────────────
// Wear log history with context
// ─────────────────────────────────────────────

export async function getWearHistory(userId, { page = 1, limit = 20 } = {}) {
  const skip = (parseInt(page) - 1) * parseInt(limit)

  const [logs, total] = await Promise.all([
    WearLog.find({ userId })
      .populate({
        path:   'outfitId',
        select: 'outfitName items',
        populate: {
          path:   'items.clothId',
          select: 'imageUrl category color subCategory',
        },
      })
      .sort({ wornAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    WearLog.countDocuments({ userId }),
  ])

  return {
    logs,
    pagination: {
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  }
}

// ─────────────────────────────────────────────
// Full dashboard summary — single call for
// everything the analytics screen needs
// ─────────────────────────────────────────────

export async function getDashboardSummary(userId) {
  const [utilization, sleeping, wearFreq, cpw] = await Promise.all([
    getWardrobeUtilization(userId),
    getSleepingItems(userId),
    getWearFrequency(userId, 5),
    getCostPerWearAnalytics(userId),
  ])

  return {
    utilization,
    sleeping: {
      count: sleeping.count,
      items: sleeping.items.slice(0, 5),
      tip:   sleeping.tip,
    },
    topWorn:    wearFreq.mostWorn,
    neverWorn:  wearFreq.neverWorn.slice(0, 5),
    bestValue:  cpw.bestValue,
    worstValue: cpw.worstValue,
    spendSummary: cpw.summary,
  }
}