const express = require('express')
const router = express.Router()
const geocode = require('../utils/geocode.js')
const forecast = require('../utils/forecast.js')
router.route('/')
.get((req,res)=>{
    if (!req.query.search) {
        return res.send({ErrorMessage: "Provide a Location"})
    } else {
        const user_input = req.query.search
        geocode(user_input, (error,data)=>{

            if(error){
                return res.send({ErrorMessage:error})
            }
        
        forecast(data.latitude,data.longitude,  (error, data) => {
            if(error){
                return res.send({ErrorMessage:error})
            }
            return res.send({Temperature: data.temperature, Country: data.country, Place: data.place})    
        
          })    
        
        
        })



    }
   
    })


module.exports = router