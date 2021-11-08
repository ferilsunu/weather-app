const request = require('request')
const geocode = (address,callback)=>{

    const mapbox_url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(address)  + '.json?access_token=' + process.env.mapbox_token

    request({url: mapbox_url, json: true},(error,response)=>{
        

        if(error){
            callback("No Network or Unable to connect the api",undefined)
        } else if(response.body.features.length === 0){
           callback("Wrong Search Query. Please try again with correct term",undefined)
        }
        else {
            const latitude = response.body.features[0].center[1]
            const longitude = response.body.features[0].center[0]
            const data = {latitude:latitude,longitude:longitude}
            callback(undefined,data)
        
        }
        
        
        })
  



}

module.exports = geocode
