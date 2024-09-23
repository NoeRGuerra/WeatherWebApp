import config from '../config';

function getWeatherData(location) {
    const { apiKey } = config;
    const apiURL = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location}?unitGroup=us&key=${apiKey}&contentType=json`;
    return fetch(apiURL)
        .then((response) => {
            if (!response.ok) {
                throw new Error(
                    `Network response not OK: ${response.statusText}`,
                );
            }
            return response.json();
        })
        .catch((error) => {
            console.error('Error');
            throw error;
        });
}

function processWeatherData(weatherData) {
    return {
        location: weatherData.resolvedAddress,
        currentConditions: weatherData.currentConditions,
        todayData: weatherData.days[0],
        twoWeeks: weatherData.days.slice(1),
    };
}

function showInputPage() {
    const container = document.querySelector('#content');
    const tagline = document.createElement('p');
    tagline.textContent = 'Enter location:';
    const inputForm = document.createElement('form');
    const input = document.createElement('input');
    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Submit';

    inputForm.append(input, submitBtn);
    container.append(tagline, inputForm);
}

getWeatherData('Reynosa').then((data) => console.log(data));

showInputPage();
