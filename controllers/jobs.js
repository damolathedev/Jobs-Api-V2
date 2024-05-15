const Job = require('../models/Job')
const { StatusCodes } = require('http-status-codes')
const { BadRequestError, NotFoundError } = require('../errors')
const mongoose = require('mongoose')
const moment = require('moment')


const getAllJobs = async (req, res) => {
  const {search, status, jobType, sort} = req.query
  let queryObject = {
    createdBy : req.user.userId
  }
  if(search){
    queryObject.position = {$regex: search, $options : "i" }
  }

  if(status && status !=="all"){
    queryObject.status = status
  }
  if(jobType && jobType !=="all"){
    queryObject.jobType = jobType
  }
  let results = Job.find(queryObject)

  if(sort && sort==="latest"){
    results = results.sort("-createdAt")
  }
  if(sort && sort === "oldest"){
    results = results.sort("createdAt")
  }
  if(sort && sort === "a-z"){
    results = results.sort("position")
  }
  if(sort && sort === "z-a"){
    results = results.sort("-position")
  }

  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10
  const skip = (page - 1) * limit

  // console.log(page, limit, skip)

  results = results.skip(skip).limit(limit)
  
  const jobs = await results
  const totalJobs = await Job.countDocuments(queryObject)
  const numOfPages = Math.ceil(totalJobs / limit)

  res.status(StatusCodes.OK).json({ jobs, totalJobs, numOfPages })
}


const getJob = async (req, res) => {
  const {
    user: { userId },
    params: { id: jobId },
  } = req

  const job = await Job.findOne({
    _id: jobId,
    createdBy: userId,
  })
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`)
  }
  res.status(StatusCodes.OK).json({ job })
}

const createJob = async (req, res) => {
  req.body.createdBy = req.user.userId
  const job = await Job.create(req.body)
  res.status(StatusCodes.CREATED).json({ job })
}

const updateJob = async (req, res) => {
  const {
    body: { company, position },
    user: { userId },
    params: { id: jobId },
  } = req

  if (company === '' || position === '') {
    throw new BadRequestError('Company or Position fields cannot be empty')
  }
  const job = await Job.findByIdAndUpdate(
    { _id: jobId, createdBy: userId },
    req.body,
    { new: true, runValidators: true }
  )
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`)
  }
  res.status(StatusCodes.OK).json({ job })
}

const deleteJob = async (req, res) => {
  const {
    user: { userId },
    params: { id: jobId },
  } = req

  const job = await Job.findByIdAndRemove({
    _id: jobId,
    createdBy: userId,
  })
  if (!job) {
    throw new NotFoundError(`No job with id ${jobId}`)
  }
  res.status(StatusCodes.OK).send()
}

const showStats =async (req, res)=>{
  let stats = await Job.aggregate([
    {$match : {createdBy: mongoose.Types.ObjectId(req.user.userId)}},
    {$group : {_id : "$status", count : {$sum: 1}}}
  ])

  stats = stats.reduce((acc, cur)=>{
    const {_id:title, count} = cur
    acc[title] = count
    return acc
  }, {})

  const defaultStats={
    pending : stats.pending || 0,
    declined : stats.declined || 0,
    interview : stats.interview || 0
  }

  let monthlyApplications = await Job.aggregate([
    {$match : {createdBy : mongoose.Types.ObjectId(req.user.userId)}},
    {
      $group : {_id : {year: {$year: "$createdAt"}, month: {$month: "$createdAt"}}, count: {$sum : 1}}
    },
    {$sort: {"id.year": -1, '_id.month': -1}},
    {$limit: 6}

  ])

  monthlyApplications = monthlyApplications.map((item)=>{
    const {
      _id:{year, month}, count
    } = item
    const date = moment().month(month -1).year(year).format("MMM Y");
    return {date, count}
  }).reverse()
  console.log(req.user);
  res.status(StatusCodes.OK).json({defaultStats, monthlyApplications})  
}


module.exports = {
  createJob,
  deleteJob,
  getAllJobs,
  updateJob,
  getJob,
  showStats
}
