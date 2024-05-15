require('dotenv').config()
const connectDb = require("./db/connect")
const jobs = require("./models/Job")
const data = require("./data.json")


const start= async()=>{
    try {
        await connectDb(process.env.MONGO_URI)
        await jobs.deleteMany()
        await jobs.create(data)
        process.exit(0)
    } catch (error) {
        console.log(error);
        process.exit(1)
    }
}

start()