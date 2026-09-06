import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import OutfitPlan from '../models/OutfitPlan.js'
import Outfit from '../models/Outfit.js'
import { processSignal } from '../services/learning/signalProcessor.js'

// ─────────────────────────────────────────────
// Timezone-safe date helpers
// ─────────────────────────────────────────────

function normalizeDateToUTC(dateInput) {
  if (!dateInput) return null
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [, y, m, d] = match
      return new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 0, 0, 0, 0))
    }
  }
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return null
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0))
}

function formatUTCDateToString(date) {
  const d = new Date(date)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─────────────────────────────────────────────
// Plan outfit for a date
// POST /api/plans
// Body: { outfitId, date, occasion, notes }
// ─────────────────────────────────────────────

export const createPlan = asyncHandler(async (req, res) => {
  const { outfitId, date, occasion, notes, recommendationId } = req.body

  if (!outfitId || !date) {
    throw new ApiError(400, 'outfitId and date are required')
  }

  const planDate = normalizeDateToUTC(date)
  if (!planDate) {
    throw new ApiError(400, 'Invalid date format')
  }

  const outfit = await Outfit.findOne({ _id: outfitId, userId: req.user._id })
  if (!outfit) throw new ApiError(404, 'Outfit not found')

  // Search window covers both exact UTC midnight and legacy offset plans within ±12h
  const windowStart = new Date(planDate.getTime() - 12 * 60 * 60 * 1000)
  const windowEnd = new Date(planDate.getTime() + 12 * 60 * 60 * 1000)

  const existingPlan = await OutfitPlan.findOne({
    userId: req.user._id,
    date: { $gte: windowStart, $lte: windowEnd },
  })

  let plan
  if (existingPlan) {
    existingPlan.outfitId = outfitId
    existingPlan.recommendationId = recommendationId || undefined
    existingPlan.source = 'user_selected'
    existingPlan.status = 'planned'
    existingPlan.occasion = occasion || outfit.occasion
    existingPlan.notes = notes
    existingPlan.date = planDate // Normalize to exact UTC midnight
    plan = await existingPlan.save()
  } else {
    plan = await OutfitPlan.findOneAndUpdate(
      { userId: req.user._id, date: planDate },
      {
        outfitId,
        recommendationId: recommendationId || undefined,
        source:   'user_selected',
        status:   'planned',
        occasion: occasion || outfit.occasion,
        notes,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  }

  return res.status(201).json(
    new ApiResponse(201, { plan }, 'Outfit planned successfully')
  )
})

// ─────────────────────────────────────────────
// Get week plan
// GET /api/plans/week
// Query: startDate (defaults to today)
// ─────────────────────────────────────────────

export const getWeekPlan = asyncHandler(async (req, res) => {
  const startDate = req.query.startDate
    ? normalizeDateToUTC(req.query.startDate)
    : normalizeDateToUTC(new Date())

  const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)

  // Query plans within range, with 12h buffer for legacy plans
  const queryStart = new Date(startDate.getTime() - 12 * 60 * 60 * 1000)
  const queryEnd = new Date(endDate.getTime() + 12 * 60 * 60 * 1000)

  const plans = await OutfitPlan.find({
    userId: req.user._id,
    date:   { $gte: queryStart, $lte: queryEnd },
  })
    .populate({
      path:   'outfitId',
      select: 'items outfitName whyItWorks vibe',
      populate: {
        path:   'items.clothId',
        select: 'imageUrl category color subCategory',
      },
    })
    .sort({ date: 1 })
    .lean()

  const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const week = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const dateStr = formatUTCDateToString(day)
    const dayOfWeek = WEEKDAY_NAMES[day.getUTCDay()]

    const dayStart = day.getTime()

    const plan = plans.find(p => {
      const pDateStr = formatUTCDateToString(p.date)
      if (pDateStr === dateStr) return true
      const pTime = new Date(p.date).getTime()
      // Catch legacy offset plans saved within 12 hours before dayStart
      return pTime >= dayStart - 12 * 3600000 && pTime < dayStart
    })

    week.push({
      date:       dateStr,
      dayOfWeek:  dayOfWeek,
      plan:       plan || null,
    })
  }

  return res.json(
    new ApiResponse(200, { week }, 'Week plan fetched')
  )
})

// ─────────────────────────────────────────────
// Get plans for a date range
// GET /api/plans
// Query: startDate, endDate
// ─────────────────────────────────────────────

export const getPlans = asyncHandler(async (req, res) => {
  const {
    startDate,
    endDate,
    status,
    page  = 1,
    limit = 30,
  } = req.query

  const filter = { userId: req.user._id }

  if (startDate || endDate) {
    filter.date = {}
    if (startDate) {
      const s = normalizeDateToUTC(startDate)
      filter.date.$gte = new Date(s.getTime() - 12 * 60 * 60 * 1000)
    }
    if (endDate) {
      const e = normalizeDateToUTC(endDate)
      filter.date.$lte = new Date(e.getTime() + 24 * 60 * 60 * 1000 - 1)
    }
  }

  if (status) filter.status = status

  const skip = (parseInt(page) - 1) * parseInt(limit)

  const [plans, total] = await Promise.all([
    OutfitPlan.find(filter)
      .populate({
        path:   'outfitId',
        select: 'items outfitName whyItWorks vibe',
        populate: {
          path:   'items.clothId',
          select: 'imageUrl category color',
        },
      })
      .sort({ date: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    OutfitPlan.countDocuments(filter),
  ])

  return res.json(
    new ApiResponse(200, {
      plans,
      pagination: {
        total,
        page:       parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    }, 'Plans fetched')
  )
})

// ─────────────────────────────────────────────
// Update plan status
// PATCH /api/plans/:planId/status
// Body: { status } — planned | worn | skipped | cancelled
// ─────────────────────────────────────────────

export const updatePlanStatus = asyncHandler(async (req, res) => {
  const { status, rating, feedback } = req.body
 
  const validStatuses = ['planned', 'worn', 'skipped', 'cancelled']
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${validStatuses.join(', ')}`)
  }
 
  const plan = await OutfitPlan.findOne({ _id: req.params.planId, userId: req.user._id })
  if (!plan) throw new ApiError(404, 'Plan not found')
 
  plan.status = status
  if (status === 'worn') plan.wornAt = new Date()
  await plan.save()
 
  if (status === 'worn') {
    await processSignal({
      userId:    req.user._id,
      outfitId:  plan.outfitId,
      eventType: 'worn',
      rating:    rating ? parseInt(rating) : null,
      feedback,
      context: {
        occasion: plan.occasion,
        dayOfWeek: new Date().getDay(),
      },
      recommendationId: plan.recommendationId || undefined, // <-- added
    })
  }
 
  return res.json(
    new ApiResponse(200, { plan }, `Plan marked as ${status}`)
  )
})

// ─────────────────────────────────────────────
// Delete plan
// DELETE /api/plans/:planId
// ─────────────────────────────────────────────

export const deletePlan = asyncHandler(async (req, res) => {
  const plan = await OutfitPlan.findOneAndDelete({
    _id:    req.params.planId,
    userId: req.user._id,
  })

  if (!plan) throw new ApiError(404, 'Plan not found')

  return res.json(
    new ApiResponse(200, {}, 'Plan deleted')
  )
})