import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import OutfitPlan from '../models/OutfitPlan.js'
import Outfit from '../models/Outfit.js'
import { processSignal } from '../services/learning/signalProcessor.js'

// ─────────────────────────────────────────────
// Plan outfit for a date
// POST /api/plans
// Body: { outfitId, date, occasion, notes }
// ─────────────────────────────────────────────

export const createPlan = asyncHandler(async (req, res) => {
  const { outfitId, date, occasion, notes } = req.body

  if (!outfitId || !date) {
    throw new ApiError(400, 'outfitId and date are required')
  }

  const planDate = new Date(date)
  if (isNaN(planDate.getTime())) {
    throw new ApiError(400, 'Invalid date format')
  }

  // Verify outfit belongs to user
  const outfit = await Outfit.findOne({
    _id:    outfitId,
    userId: req.user._id,
  })
  if (!outfit) throw new ApiError(404, 'Outfit not found')

  // Normalise date to start of day to avoid timezone issues
  planDate.setHours(0, 0, 0, 0)

  // Upsert — if plan already exists for this date, replace it
  const plan = await OutfitPlan.findOneAndUpdate(
    { userId: req.user._id, date: planDate },
    {
      outfitId,
      source:   'user_selected',
      status:   'planned',
      occasion: occasion || outfit.occasion,
      notes,
    },
    { upsert: true, new: true }
  )

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
    ? new Date(req.query.startDate)
    : new Date()

  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)
  endDate.setHours(23, 59, 59, 999)

  const plans = await OutfitPlan.find({
    userId: req.user._id,
    date:   { $gte: startDate, $lte: endDate },
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

  // Build 7-day structure — fill gaps with null
  const week = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate)
    day.setDate(startDate.getDate() + i)

    const plan = plans.find(p => {
      const planDay = new Date(p.date)
      return planDay.toDateString() === day.toDateString()
    })

    week.push({
      date:       day.toISOString().split('T')[0],
      dayOfWeek:  day.toLocaleDateString('en-US', { weekday: 'long' }),
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
    if (startDate) filter.date.$gte = new Date(startDate)
    if (endDate)   filter.date.$lte = new Date(endDate)
  }

  if (status) filter.status = status

  const skip = (parseInt(page) - 1) * parseInt(limit)

  const [plans, total] = await Promise.all([
    OutfitPlan.find(filter)
      .populate({
        path:   'outfitId',
        select: 'items outfitName vibe',
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

  const plan = await OutfitPlan.findOne({
    _id:    req.params.planId,
    userId: req.user._id,
  })

  if (!plan) throw new ApiError(404, 'Plan not found')

  plan.status = status
  if (status === 'worn') plan.wornAt = new Date()
  await plan.save()

  // If marked as worn — trigger full learning pipeline
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