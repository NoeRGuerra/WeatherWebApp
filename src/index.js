import {
    parse,
    differenceInMinutes,
    format,
    fromUnixTime,
    parseISO,
} from 'date-fns';
import config from '../config';
import './style.css';

const importAllIcons = require.context('./icons', false, /\.svg$/);
const icons = {};

importAllIcons.keys().forEach((iconPath) => {
    const iconName = iconPath.replace('./', '').replace('.svg', '');
    icons[iconName] = importAllIcons(iconPath);
});

const units = {
    temp: 'F',
    wind: 'mph',
};

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

function convertToCelsius(tempInFarenheit) {
    return ((tempInFarenheit - 32) * 5) / 9;
}

function convertToFahrenheit(tempInCelsius) {
    return (tempInCelsius * 9) / 5 + 32;
}

function convertToKmh(speedInMph) {
    return speedInMph * 1.609;
}

function convertToMph(speedInKmh) {
    return speedInKmh / 1.609;
}

function convertUnits(weatherObject) {
    // Convert units locally
    let convertTemp = convertToCelsius;
    let convertSpeed = convertToKmh;
    if (units.temp === 'C') {
        convertTemp = convertToFahrenheit;
        convertSpeed = convertToMph;
    }
    const updatedWeatherObject = JSON.parse(JSON.stringify(weatherObject));

    updatedWeatherObject.currentConditions.temp = convertTemp(
        weatherObject.currentConditions.temp,
    );
    updatedWeatherObject.todayData.maxTemp = convertTemp(
        weatherObject.todayData.maxTemp,
    );
    updatedWeatherObject.todayData.minTemp = convertTemp(
        weatherObject.todayData.minTemp,
    );
    updatedWeatherObject.currentConditions.windSpeed = convertSpeed(
        weatherObject.currentConditions.windSpeed,
    );

    weatherObject.twentyfourHours.forEach((forecast, index) => {
        updatedWeatherObject.twentyfourHours[index].temp = convertTemp(
            forecast.temp,
        );
        updatedWeatherObject.twentyfourHours[index].windspeed = convertSpeed(
            forecast.windspeed,
        );
    });
    weatherObject.twoWeeks.forEach((day, index) => {
        updatedWeatherObject.twoWeeks[index].tempmax = convertTemp(day.tempmax);
        updatedWeatherObject.twoWeeks[index].tempmin = convertTemp(day.tempmin);
        updatedWeatherObject.twoWeeks[index].windspeed = convertSpeed(
            day.windspeed,
        );
    });

    units.temp = units.temp === 'F' ? 'C' : 'F';
    units.wind = units.wind === 'mph' ? 'kmh' : 'mph';

    return updatedWeatherObject;
}

function createTodayWeatherContainer(weatherObject) {
    const weatherContainer = document.createElement('div');
    weatherContainer.className = 'current-weather';
    const leftContainer = document.createElement('div');
    leftContainer.className = 'top-left';
    const rightContainer = document.createElement('div');
    rightContainer.className = 'top-right';

    const icon = document.createElement('img');
    icon.src = icons[weatherObject.currentConditions.icon];
    icon.className = 'big-icon';
    const currentTemp = createDataContainer(
        `${Math.round(weatherObject.currentConditions.temp)} ${units.temp}°`,
        weatherObject.currentConditions.conditions,
    );

    const tempText = currentTemp.querySelector('p');
    tempText.addEventListener('click', () => {
        drawPage(convertUnits(weatherObject));
    });

    leftContainer.append(icon, currentTemp);

    const parsedSunrise = parse(
        weatherObject.todayData.sunrise,
        'HH:mm:ss',
        new Date(),
    );
    const parsedSunset = parse(
        weatherObject.todayData.sunset,
        'HH:mm:ss',
        new Date(),
    );

    const todayWeatherData = {
        High: `${Math.round(weatherObject.todayData.maxTemp)} ${units.temp}°`,
        Low: `${Math.round(weatherObject.todayData.minTemp)} ${units.temp}°`,
        Sunrise: format(parsedSunrise, 'h:mm a'),
        Sunset: format(parsedSunset, 'h:mm a'),
        Rain: `${weatherObject.currentConditions.chanceOfPrecip} %`,
        Wind: `${Math.round(weatherObject.currentConditions.windSpeed)} ${units.wind}`,
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
    icon.src = icons[forecast.icon];
    icon.className = 'icon';
    const temp = document.createElement('p');
    temp.textContent = `${Math.round(forecast.temp)} ${units.temp}°`;
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

function showMessage(message, type = 'message') {
    // Show a disappearing message or error
    const container = document.createElement('div');
    container.className = `flash-${type}`;
    const messageElement = document.createElement('span');
    messageElement.textContent = message;
    container.append(messageElement);
    document.querySelector('#content').append(container);

    setTimeout(() => {
        container.classList.add('hidden');
        setTimeout(() => {
            container.remove();
        }, 1000);
    }, 5000);
}

function updatePage() {
    // Call API and redraw page
    const currentLocation = document.querySelector('h2').textContent;
    getWeatherData(currentLocation)
        .then((data) => {
            const updatedWeatherObject = processWeatherData(data);
            if (units.temp === 'C') {
                drawPage(convertUnits(updatedWeatherObject));
            } else {
                drawPage(updatedWeatherObject);
            }
            const updateButton = document.querySelector('button');
            updateButton.disabled = true;
            setTimeout(() => {
                updateButton.disabled = false;
            }, 5000);
            showMessage('Update successful');
        })
        .catch((error) => {
            showMessage(error, 'error');
        });
}

function createButton(text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.addEventListener('click', onClick);

    return button;
}

function createLastUpdatedLabel(timestamp) {
    const container = document.createElement('div');
    container.className = 'update-label';
    const parsedDate = fromUnixTime(timestamp);
    const timeDifference = differenceInMinutes(new Date(), parsedDate);
    const lastUpdatedLabel = document.createElement('p');
    lastUpdatedLabel.textContent = `Updated ${timeDifference} minutes ago`;
    const updateButton = createButton('🔁', () => {
        updatePage();
    });

    container.append(lastUpdatedLabel, updateButton);

    return container;
}

function createWeatherRow(forecast) {
    const container = document.createElement('div');
    container.className = 'weather-row';
    const date = parseISO(forecast.datetime);
    const dateContainer = createDataContainer(
        format(date, 'EEE'),
        format(date, 'MM/dd'),
    );
    const icon = document.createElement('img');
    icon.src = icons[forecast.icon];
    icon.className = 'icon';

    const minTempContainer = createDataContainer(
        `${Math.round(forecast.tempmin)} ${units.temp}°`,
        'Low',
    );
    const maxTempContainer = createDataContainer(
        `${Math.round(forecast.tempmax)} ${units.temp}°`,
        'High',
    );
    const windContainer = createDataContainer(
        `${Math.round(forecast.windspeed)} ${units.wind}`,
        'Wind',
    );
    const rainContainer = createDataContainer(
        `${forecast.precipprob}%`,
        'Rain',
    );

    container.append(
        dateContainer,
        icon,
        minTempContainer,
        maxTempContainer,
        windContainer,
        rainContainer,
    );

    return container;
}

function createFourteenDayContainer(weatherObj) {
    const container = document.createElement('div');
    container.className = 'twoweeks-forecast';

    weatherObj.twoWeeks.forEach((day) => {
        container.append(createWeatherRow(day));
    });

    return container;
}

function clearPage() {
    const container = document.querySelector('#content');
    container.replaceChildren();
}

function drawPage(weatherObject) {
    clearPage();
    const container = document.querySelector('#content');
    const locationHeading = createHeader(weatherObject.location, 'h2');

    const lastUpdatedLabel = createLastUpdatedLabel(
        weatherObject.currentConditions.lastUpdate,
    );
    const weatherContainer = createTodayWeatherContainer(weatherObject);

    const forecastHeading = createHeader("Today's weather", 'h3');
    const forecastContainer = createHourlyForecastContainer(weatherObject);

    const fourteenDayHeading = createHeader('14-day forecast', 'h3');
    const fourteenDayContainer = createFourteenDayContainer(weatherObject);

    container.replaceChildren();
    container.append(
        locationHeading,
        lastUpdatedLabel,
        weatherContainer,
        forecastHeading,
        forecastContainer,
        fourteenDayHeading,
        fourteenDayContainer,
    );
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
            // console.log(data);
            // console.log(weatherObj);
            drawPage(weatherObj);
        })
        .catch((error) => {
            showMessage(error, 'message');
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
