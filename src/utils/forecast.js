const request = require('request')
const forecast = (latitude,longitude,callback) => {

    const weather_api = 'http://api.openweathermap.org/data/2.5/weather?lat='+latitude+ '&lon=' + longitude + '&appid=' + process.env.openweather_api + '&units=metric'

    request({url:weather_api, json: true},(error,response)=>{
        if(error) {
            callback("Unable to connect to the API",undefined)  
        }   
        else if(response.body.cod === "404") {
            callback("Error in the location. Please check",undefined)
        }  else {
            
            callback(undefined,{temperature: response.body.main.temp,country: response.body.sys.country, place: response.body.name })
        }
        
    })
    
    


}

module.exports = forecast