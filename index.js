'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workouts {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    #workouts = [];
    constructor(distance, duration, coords) {
        this.coords = coords; // [lat, lng]
        this.distance = distance; // in km
        this.duration = duration; // in mins
    }

    _setDescription() {
        // prettier-ignore
        // above to avoid setting the array elements line by line
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()} ${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }
}

class Running extends Workouts {
    type = 'running';
    constructor(distance, duration, coords, cadence) {
        super(distance, duration, coords);
        this.cadence = cadence
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        this.pace = this.duration / this.distance;
    }
}

class Cycling extends Workouts {
    type = 'cycling';
    constructor(distance, duration, coords, elevation) {
        super(distance, duration, coords);
        this.elevation = elevation;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        this.speed = this.distance / (this.duration / 60);
    }
}

class App {
    #map;
    #mapZoomLevel;
    #mapEvent;
    #workouts = [];
    sort = false;
    constructor() {
        // Get users position
        this._getPosition();

        // Get data from local storage
        this._getLocalStorage();

        // Attach event handlers
        form.addEventListener('click', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleField.bind(this));
        containerWorkouts.addEventListener('click', this.moveToPopup.bind(this));
    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap, function () {
                alert('Could not get your position!');
            });
        }
    }

    _loadMap(position) {
        const { latitude, longitude } = position.coords;
        const coords = [latitude, longitude];
        this.#map = L.map('map').setView([coords], this.#mapZoomLevel);

        L.titleLayer('https://{s}.tile.oopenstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        // Handling clicks on map
        this.#map.on('click', this._showForm.bind(this));

        // Display marker on the map on load
        this.#workouts.forEach(work => this._renderWorkoutMarker(work));
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        inputDistance.value = inputDuration.value = inputElevation.value
            = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid');
    }

    _toggleField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _renderWorkout(workout) {
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
                <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
                <span class="workout__value">${workout.distance}}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
        </div>
        `
        if (workout.type === 'running')
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
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
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevation}</span>
                    <span class="workout__unit">spm</span>
                </div>
            </li>
            `;

        form.insertAdjacentHTML('afterend', html);
    }

    _renderWorkoutMarker(workout) {
        // Display marker
        L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(
                L.popUp({
                    maxWidth: 250,
                    minWidth: 100,
                    closeOnClick: false,
                    className: `${workout.type}--popup`,
                    autoClose: false,
                })
            )
            .setPopupContent(
                `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
            )
            .openPopop();
    }

    _newWorkout(e) {
        e.preventDefault();
        const isValid = (...inputs) =>
            inputs.every(input => Number.isFinite(input));
        const allPositive = (...values) =>
            values.every(value => value > 0);

        // Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;

        // If workout is running, create running obj
        if (type === 'running') {
            const cadence = +inputCadence.value;
            // Check data is valid
            if (
                isValid(distance, duration, cadence) ||
                !allPositive(distance, duration, cadence)
            )
                return alert('Only positive inputs allowed!')
            workout = new Running(distance, duration, [lat, lng], cadence);
        }

        // If workout is cycling, create cycling obj
        if (type === 'cycling') {
            const elevation = +inputElevation.value;
            // Check if data is valid
            if (
                isValid(distance, duration, elevation) ||
                !allPositive(distance, duration)
            )
                return alert('Only positive inputs allowed!')
            workout = new Cycling(distance, duration, [lat, lng], elevation);
        }

        // Add new value to the array
        this.#workouts.push(workout);

        // Render marker on the map
        this._renderWorkoutMarker();

        // Render workout on the list
        this._renderWorkout();

        // Hide form + clear input fields
        this._hideForm();

        // Set localStorage to all workouts
        this._setLocalStorage();
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');

        if (!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id)

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            },
        })
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));

        if (!data) return;

        this.#workouts = data;
        this.#workouts.forEach(work => {
            this._renderWorkout(work);
        })
    }

    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }

    editWorkout(e) {
        e.preventDefault();
        const isValid = (...inputs) =>
            inputs.every(input => Number.isFinite(input));
        const allPositive = (...values) =>
            values.every(value => value > 0);

        // Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value || +e.target.value;
        const duration = +inputDuration.value || +e.target.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;

        // If workout is running, create running obj
        if (type === 'running') {
            const cadence = +inputCadence.value || +e.target.value;

            // Check data is valid
            if (
                isValid(distance, duration, cadence) ||
                !allPositive(distance, duration, cadence)
            )
                return alert('Only positive inputs allowed!')
            workout = new Running(distance, duration, [lat, lng], cadence);
        }

        // If workout is cycling, create cycling obj
        if (type === 'cycling') {
            const elevation = +inputElevation.value || +e.target.value;
            // Check if data is valid
            if (
                isValid(distance, duration, elevation) ||
                !allPositive(distance, duration)
            )
                return alert('Only positive inputs allowed!')
            workout = new Cycling(distance, duration, [lat, lng], elevation);
        }

        // Add new value to the array
        this.#workouts.push(workout);

        // Render marker on the map
        this._renderWorkoutMarker();

        // Render workout on the list
        this._renderWorkout();

        // Hide form + clear input fields
        this._hideForm();

        // Set localStorage to all workouts
        this._setLocalStorage();
    }

    deleteWorkout(e) {
        const workoutEl = e.target.closest('.workout');

        if (!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id)
        const newWorkout = this.#workouts.filter(work => work.id !== workoutEl.dataset.id)

        localStorage.setItem('workout', JSON.stringify(newWorkout));
    }

    deleteAllWorkouts() {
        this.#workouts = [];
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    sortWorkout() {
        const workout = sort ? this.#workouts.slice().sort((a, b) => a.distance - b.distance) :
            this.#workouts;
    }
}

const app = new App();

let sorted = false
sortBtn.addEventListener('click', function () {
    app.sortWorkout();
    app._newWorkout();
    sorted = !sorted;
});


// ASYNC WAY
////////////////////////

const getPosition = function () {
    return new Promise((resolve, reject) => {
        // navigator.geolocation.getCurrentPosition(
        //     position => resolve(position),
        //     err => reject(err)
        // );

        // Simplified form of the above code
        navigator.geolocation.getCurrentPosition(resolve, reject)
    })
}