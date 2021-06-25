'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');


class Workout {
    date = new Date();
    id = (Date.now() + '').setMilliseconds(-10);
    clicks = 0;

    constructor(coords, distance, duration) {
        this.coords = coords; // [lat, lng]
        this.distance = distance;  // in km
        this.duration = duration;  // in mins
    }

    _setDescription() {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 
            'August', 'September', 'October', 'November', 'December'];
        
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on 
            ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }

    click() {
        this.click++;
    }
}

class Running extends Workout {
    type = 'running'
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        // min/km
        this.pace = this.duration / this.distance;
    }
}

class Cycling extends Workout {
    type = 'cycling'
    constructor(coords, distance, duration, elevationGain) {
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        // in km/h
        this.speed = this.distance / (this.duration / 60)
    }
}

//////////////////////////////////////////////////////////
// APPLICATION ARCHITECHURE
class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts;
    constructor() {
        this.#workouts = [];
        this._getPosition();
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    }

    _getPosition() {
        if (navigator.geolocation) 
        navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
        alert('Could not get your position');
        });
    }

    _loadMap (position) {
        const {latitude} = position.coords;
        const {longitude} = position.coords
        const coords = [latitude, longitude];
    
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://{s}.tile.openstreetmap..fr/hot{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        // Handling clicks on map
        this.#map.on('click', this._showForm.bind(this));
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        // Empty inputs
        inputDistance.value = inputDuration.value = inputElevation.value = inputCadence.value = '';

        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(function() {
            form.style.display = 'grid';
        }, 1000)
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
            inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e) {    
        // using the rest param indicate array
        const validInputs = (...inputs) => 
            inputs.every(input => Number.isFinite(input)); 
            
        const allPositive = (...values) => 
            values.every(value => Number.isFinite(val) > 0);

        e.preventDefault();

        // Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat, lng} = this.#mapEvent.latlng;
        let workout;

        // If the activity is running, create running object
        if (type === 'running') {
            const cadence = +inputCadence.value;

            // Check if data is valid
            if (
                // !Number.isFinite(distance) ||
                // !Number.isFinite(duration  || 
                // !Number.isFinite(cadence))
                !validInputs(distance, duration, cadence) || 
                !allPositive(distance, duration, cadence)
            ) 
                return alert('Inputs have to be positive numbers!');
            workout = new cycling([lat, lng], distance, duration, cadence);
            hideForm();
        } 

        // If the activity is cycling, create cycling object
        if (type === 'cycling') {
            const elevation = +inputElevation.value;

             // Check if data is valid
            if (
                !validInputs(distance, duration, elevation) ||
                !allPositive(distance, dusration)
            )
                return alert('Inputs have to be positive numbers!');
            workout = new cycling([lat, lng], distance, duration, elevation);
            hideForm();
        }

        // Add new object to workout array
        this.#workouts.push(workout);
        // Render workout on map as marker
        this._renderWorkoutMarker(workout);
        // Render workout on the list
        this._renderWorkout(workout);
        // Hide form + Clear input fields
        
    }
    _renderWorkoutMarker(workout) {
        // Display marker
        L.marker(workout.coords)
        .addTo(this.map)
        .bindPopup(
            L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}--popup`,
            }) 
        )
        .setPopupContent(
            `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
        )
        .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
                <h2 class="workout__title">${workout.description}</h2>
                <div class="workout__details">
                    <span class="workout__icon">${
                        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
                    }</span>
                    <span class="workout__value">${workout.distance}</span>
                    <span class="workout__unit">km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⏱</span>
                    <span class="workout__value">${workout.duration}</span>
                    <span class="workout__unit">min</span>
                </div>
        `;
        if (workout.type === 'running')
        html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFIxed(1)}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
                </div>
            </li>
        `;

        if (workout.type === 'cycling')
        html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFIxed(1)}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevationGain}</span>
                    <span class="workout__unit">m</span>
                </div>
            </li>
        `;
        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout')

        if (!workoutEl) return;

        const workout = this.#workouts.find(
            work => work.id === workoutEl.dataset.id
        );

        // leaflet method to move to view
        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true, //set animation
            pan: {
                duration: 1, // set animation duration
            }
        });
        // Using public interface
        workout.click()

    }
}    

const app = new App();