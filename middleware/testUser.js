const {BadRequestError} = require("../errors")

const testUser= async (req, res, next)=>{
    if(req.user.testUser){
        console.log(req.user);
        throw new BadRequestError("Test user. Read only")
    }
    next()
}

module.exports = testUser