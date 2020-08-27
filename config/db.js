const mongoose = require('mongoose')

//Use mongoose to connect MongoDB using the Mongo URI
const connectDb = async () => {
    const connection = await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: true,
        useUnifiedTopology: true
    })

    console.log('MongoDB  Connected')
}

module.exports = connectDb
