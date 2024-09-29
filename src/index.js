import { parse, differenceInMinutes, format, fromUnixTime } from 'date-fns';
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
    const twentyfourHours = [];
    const currentIndex =
        parseInt(new Date().toTimeString().split(':')[0], 10) + 1; // Get current hour + 1 to start 24-hour forecast in the next hour
    twentyfourHours.push(...weatherData.days[0].hours.slice(currentIndex));
    if (twentyfourHours.length < 24) {
        twentyfourHours.push(
            ...weatherData.days[1].hours.slice(0, 24 - twentyfourHours.length),
        );
    }
    return {
        location: weatherData.resolvedAddress,
        currentConditions: {
            conditions: weatherData.currentConditions.conditions,
            icon: weatherData.currentConditions.icon,
            temp: weatherData.currentConditions.temp,
            windSpeed: weatherData.currentConditions.windspeed,
            chanceOfPrecip: weatherData.currentConditions.precipprob,
            precipType: weatherData.currentConditions.preciptype,
            lastUpdate: weatherData.currentConditions.datetimeEpoch,
        },
        todayData: {
            sunrise: weatherData.days[0].sunrise,
            sunset: weatherData.days[0].sunset,
            maxTemp: weatherData.days[0].tempmax,
            minTemp: weatherData.days[0].tempmin,
        },
        twentyfourHours,
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
    const weatherContainer = document.createElement('div');
    weatherContainer.className = 'current-weather';
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
        High: `${weatherObject.todayData.maxTemp}°`,
        Low: `${weatherObject.todayData.minTemp}°`,
        Sunrise: weatherObject.todayData.sunrise,
        Sunset: weatherObject.todayData.sunset,
        Rain: `${weatherObject.currentConditions.chanceOfPrecip} %`,
        Wind: `${weatherObject.currentConditions.windSpeed} mph`,
    };
    const dataArray = Object.entries(todayWeatherData).map(([key, value]) =>
        createDataContainer(value, key),
    );

    dataArray.forEach((container) => rightContainer.append(container));

    weatherContainer.append(leftContainer, rightContainer);

    return weatherContainer;
}

function createWeatherCard(forecast) {
    const container = document.createElement('div');
    container.className = 'weather-card';
    const time = document.createElement('p');
    const parsedTime = parse(forecast.datetime, 'HH:mm:ss', new Date());
    time.textContent = format(parsedTime, 'h a');
    const icon = document.createElement('img');
    icon.src = placeholderIcon;
    icon.style.width = '40px';
    icon.style.height = 'auto';
    const temp = document.createElement('p');
    temp.textContent = `${forecast.temp} °`;
    container.append(time, icon, temp);

    return container;
}

function createHourlyForecastContainer(weatherObj) {
    const hourlyForecastContainer = document.createElement('div');
    hourlyForecastContainer.className = 'hourly-forecast';
    for (let i = 0; i < 24; i += 3) {
        const forecast = weatherObj.twentyfourHours[i];
        const weatherCard = createWeatherCard(forecast);
        hourlyForecastContainer.append(weatherCard);
    }

    return hourlyForecastContainer;
}

function createHeader(text, level) {
    const locationHeading = document.createElement(level);
    locationHeading.className = 'heading';
    locationHeading.textContent = text;

    return locationHeading;
}

function createLastUpdatedLabel(timestamp) {
    const parsedDate = fromUnixTime(timestamp);
    const timeDifference = differenceInMinutes(new Date(), parsedDate);
    const lastUpdatedLabel = document.createElement('p');
    lastUpdatedLabel.textContent = `Updated ${timeDifference} minutes ago`;

    return lastUpdatedLabel;
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
            console.log(data);
            console.log(weatherObj);
            const locationHeading = createHeader(weatherObj.location, 'h2');
            const lastUpdatedLabel = createLastUpdatedLabel(
                weatherObj.currentConditions.lastUpdate,
            );
            const weatherContainer = createTodayWeatherContainer(weatherObj);
            const forecastHeading = createHeader("Today's weather", 'h3');
            const forecastContainer = createHourlyForecastContainer(weatherObj);

            mainContainer.replaceChildren();
            mainContainer.append(
                locationHeading,
                lastUpdatedLabel,
                weatherContainer,
                forecastHeading,
                forecastContainer,
            );
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

showInputPage('Concord NC');
