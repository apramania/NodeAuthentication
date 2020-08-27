const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const connectDb = require('./config/db')

const app = express()

//Convert .env to ./config/config.env
require('dotenv').config({
    path: './config/config.env'
})

//Connect to Database
connectDb()



app.use(express.json({ extended: false }))



//config for only development
if(process.env.NODE_ENV === 'development'){
    app.use(cors({
        origin: process.env.CLIENT_URL
    }))

    app.use(morgan('dev'))
    //morgan gives information about each request
}

//Load all routes
const authRouter = require('./routes/auth.route')

//Use route
app.use('/api/', authRouter)

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Page Not Found"
    })
})

const PORT = process.env.PORT

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`)
})