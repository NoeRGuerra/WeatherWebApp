import config from '../config';
import placeholderIcon from './icons/placeholder.svg';
import './style.css';

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
        currentConditions: {
            conditions: weatherData.currentConditions.conditions,
            icon: weatherData.currentConditions.icon,
            temp: weatherData.currentConditions.temp,
            windSpeed: weatherData.currentConditions.windspeed,
            chanceOfPrecip: weatherData.currentConditions.precipprob,
            precipType: weatherData.currentConditions.preciptype,
        },
        todayData: {
            sunrise: weatherData.days[0].sunrise,
            sunset: weatherData.days[0].sunset,
            maxTemp: weatherData.days[0].tempmax,
            minTemp: weatherData.days[0].tempmin,
        },
        todayHourly: weatherData.days[0].hours,
        twoWeeks: weatherData.days.slice(1),
    };
}

function createDataContainer(value, text) {
    const container = document.createElement('div');
    const valueText = document.createElement('p');
    const valueLabel = document.createElement('p');

    valueText.textContent = value;
    valueLabel.textContent = text;

    container.append(valueText, valueLabel);
    return container;
}

function createTodayWeatherContainer(weatherObject) {
    const container = document.createElement('div');
    container.className = 'current-weather';
    const leftContainer = document.createElement('div');
    leftContainer.className = 'top-left';
    const rightContainer = document.createElement('div');
    rightContainer.className = 'top-right';

    const placeholderImg = document.createElement('img');
    placeholderImg.src = placeholderIcon;
    placeholderImg.style.width = '100px';
    placeholderImg.style.height = 'auto';
    const currentTempText = document.createElement('p');
    currentTempText.textContent = `${weatherObject.currentConditions.temp} F`;
    const conditionsText = document.createElement('p');
    conditionsText.textContent = weatherObject.currentConditions.conditions;

    leftContainer.append(placeholderImg, currentTempText, conditionsText);

    const todayWeatherData = {
        High: weatherObject.todayData.maxTemp,
        Low: weatherObject.todayData.minTemp,
        Sunrise: weatherObject.todayData.sunrise,
        Sunset: weatherObject.todayData.sunset,
        Rain: weatherObject.currentConditions.chanceOfPrecip,
        Wind: weatherObject.currentConditions.windSpeed,
    };
    const dataArray = [];
    for (const key in todayWeatherData) {
        const dataContainer = createDataContainer(todayWeatherData[key], key);
        dataArray.push(dataContainer);
    }

    for (const valueContainer of dataArray) {
        rightContainer.append(valueContainer);
    }

    container.append(leftContainer, rightContainer);

    return container;
}

function showWeatherData(location) {
    const mainContainer = document.querySelector('#content');
    mainContainer.replaceChildren();
    const loadingParagraph = document.createElement('p');
    loadingParagraph.textContent = 'Loading...';
    mainContainer.append(loadingParagraph);

    getWeatherData(location)
        .then((data) => {
            const weatherObj = processWeatherData(data);
            console.log(weatherObj);
            const weatherContainer = createTodayWeatherContainer(weatherObj);
            mainContainer.replaceChildren();
            mainContainer.append(weatherContainer);
        })
        .catch((error) => {
            mainContainer.replaceChildren();
            const errorMessage = document.createElement('p');
            errorMessage.textContent = `Error: ${error.message}`;
            mainContainer.append(errorMessage);
        });
}

function showInputPage(location = null) {
    if (location) {
        showWeatherData(location);
        return;
    }
    const container = document.querySelector('#content');
    const inputForm = document.createElement('form');
    const tagline = document.createElement('label');
    tagline.setAttribute('for', 'location-input');
    tagline.textContent = 'Enter location:';
    const input = document.createElement('input');
    input.id = 'location-input';
    input.type = 'text';
    const submitBtn = document.createElement('button');
    submitBtn.textContent = 'Submit';
    submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showWeatherData(input.value);
    });

    inputForm.append(tagline, input, submitBtn);
    container.append(inputForm);
}

showInputPage();
