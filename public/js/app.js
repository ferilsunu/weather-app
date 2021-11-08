const weatherForm = document.querySelector("form");
weatherForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const temperature_field = document.getElementById("temp")
    const user_input = document.querySelector("input").value
    const fetch_url = 'weather?search=' + user_input
    temperature_field.textContent = "Loading..."

    fetch(fetch_url).then((response) => {
        response.json().then((data) => {
            const temperature_field = document.getElementById("temp")
            if (data.ErrorMessage) {
                return temperature_field.textContent = data.ErrorMessage

            }
            const place_field = document.getElementById("place")
            place_field.innerHTML = data.Place + ', ' + data.Country
            temperature_field.innerHTML = data.Temperature + "<sup>o</sup>"

        })
    })




})