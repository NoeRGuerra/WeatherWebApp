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

function showWeatherData(location) {
    const container = document.querySelector('#content');
    container.replaceChildren();
    const loadingParagraph = document.createElement('p');
    loadingParagraph.textContent = 'Loading...';
    container.append(loadingParagraph);

    getWeatherData(location)
        .then((data) => {
            const weatherObj = processWeatherData(data);
            container.replaceChildren();
            const locationParagraph = document.createElement('p');
            const currentTempParagraph = document.createElement('p');
            locationParagraph.textContent = weatherObj.location;
            currentTempParagraph.textContent = `${weatherObj.currentConditions.temp} F`;
            container.append(locationParagraph, currentTempParagraph);
        })
        .catch((error) => {
            container.replaceChildren();
            const errorMessage = document.createElement('p');
            errorMessage.textContent = `Error: ${error.message}`;
            container.append(errorMessage);
        });
}

function showInputPage() {
    const container = document.querySelector('#content');
    const tagline = document.createElement('p');
    tagline.textContent = 'Enter location:';
    const inputForm = document.createElement('form');
    const input = document.createElement('input');
    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Submit';
    submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showWeatherData(input.value);
    });

    inputForm.append(input, submitBtn);
    container.append(tagline, inputForm);
}

getWeatherData('Reynosa').then((data) => console.log(data));

showInputPage();
