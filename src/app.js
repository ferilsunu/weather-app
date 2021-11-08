const path = require('path')
const express = require('express')
const app = express()
const hbs = require('hbs')
const request = require('request')
require('dotenv').config()


const port = process.env.PORT || 3000

const public_dir = path.join(__dirname,'../public')
const views_path = path.join(__dirname,'../template/views')
const partials_path = path.join(__dirname,'../template/partials')

hbs.registerPartials(partials_path)
app.set('view engine','hbs')
app.set('views',views_path)
app.use(express.static(public_dir))


const indexRouter = require('../src/router/index')
app.use('/',indexRouter)

const weatherRouter = require('../src/router/weather')
app.use('/weather',weatherRouter)


app.get('*',(req,res)=>{
    res.render('404')
})


app.listen(port,()=>{
    console.log("Server is up and running on port " + port)
})