// Definicja ikony autobusu
var busIcon = L.icon({
    iconUrl: '/static/image/bus.png', // Upewnij się, że ścieżka jest poprawna
    iconSize: [60, 34],
    iconAnchor: [0, 40],
    popupAnchor: [30, -40]
});

// Zmienne globalne
var map, marker, interval;
var latlngs = []; // Tutaj powinny być dane z serwera
var realGps = []; // Tutaj będą dane z serwera dla markera
var stops = []; // Tutaj powinny być dane z serwera
var distances = []; // Odległości punktów trasy
var totalDistance = 0;
var currentIndex = 0;


var stopElements = {}; // Elementy DOM przystanków
var SOME_THRESHOLD = 500; // Odległość, w której przystanek jest uważany za "blisko"

var markerDistances = {}; // Odległości przystanków od początkowego punktu

var isAnimating = false;

//var horizontalMarker = document.getElementById('horizontal-marker');
var horizontalMarker;
var lineContainer = document.getElementById('line-container');
var trackMarker = document.getElementById('track-marker-checkbox').checked;
var speed = document.getElementById('speed-slider').value;



// Funkcja inicjalizująca mapę
function initializeMap(lat, lng, latlngsArray, stopsArray, realGpsArray) {
    latlngs = latlngsArray;
    stops = stopsArray;
    realGps = realGpsArray; // Zapisz dane GPS dla markera

    map = L.map('map').setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    L.polyline(latlngs, {color: 'red'}).addTo(map);
    L.polyline(realGps, {color: 'green'}).addTo(map);

    stops.forEach(function(stop) {
        L.marker([stop.lat, stop.lon])
            .addTo(map)
            .bindPopup("<b>" + stop.name + "</b>")
            .openPopup();
    });

    marker = L.marker([lat, lng], {icon: busIcon}).addTo(map);

    // Oblicz odległości punktów trasy od początkowego punktu
    distances = [0]; // pierwszy punkt ma odległość 0
    totalDistance = distances[distances.length - 1];
    latlngs.forEach(function(latlng, index) {
        if (index === 0) return;
        var segmentLength = calculateDistance(latlngs[index - 1], latlng);
        distances.push(distances[index - 1] + segmentLength);
    });

    // Oblicz odległości przystanków od początkowego punktu
    markerDistances = stops.map(function(stop) {
    var closestPointIndex = 0;
    var closestDistance = Infinity;
    for (var i = 0; i < latlngs.length; i++) {
        var point = latlngs[i];
        var distance = calculateDistance([point[0], point[1]], [stop.lat, stop.lon]);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestPointIndex = i;
        }
    }
    return distances[closestPointIndex];
    });

    
    // Umieść markery przystanków na linii prostej
    markerDistances.forEach(function(distance, index) {
        var percentageAlongLine = (distance / distances[distances.length - 1]) * 100;
        var stopDiv = document.createElement('div');
        stopDiv.className = 'stop';
        stopDiv.style.left = percentageAlongLine + '%';
        lineContainer.appendChild(stopDiv);
        
        var label = document.createElement('span');
        label.className = 'label';
        label.innerText = stops[index].name; // Ustawienie tekstu etykiety na nazwę przystanku
        stopDiv.appendChild(label);
        // Zapisz element div w mapowaniu
        stopElements[stops[index].name] = stopDiv;
    });
}

// Funkcje pomocnicze
function calculateDistance(point1, point2) {
    return L.latLng(point1[0], point1[1]).distanceTo(L.latLng(point2[0], point2[1]));
}

function updateMarker() {
    
    if (currentIndex >= realGps.length) {
        clearInterval(interval);  // Zatrzymaj interwał, gdy dojedziemy do końca trasy
        return;
    }
    var newLatLng = realGps[currentIndex];
    marker.setLatLng(newLatLng);  // Aktualizuj lokalizację markera na mapie
    
    

    if (trackMarker) {
        map.setView(newLatLng, map.getZoom());  // Uaktualnij widok mapy, aby skupić się na markerze
    }

    // Oblicz, jak daleko marker jest wzdłuż trasy
    var distanceFromStart = distances[currentIndex];
    var percentageAlongLine = (distanceFromStart / distances[distances.length - 1]) * 100;
    horizontalMarker.style.left = percentageAlongLine + '%';  // Aktualizuj lokalizację markera na linii prostej

    // Aktualizuj etykietę współrzędnych
    var coordsLabel = document.getElementById('coords-label');
    coordsLabel.innerText = 'Współrzędne: ' + newLatLng[0].toFixed(6) + ', ' + newLatLng[1].toFixed(6);
    
    var idxLabel = document.getElementById('idx-label');
    idxLabel.innerText = 'Indeks: ' + currentIndex;
    
    
    
    
      // Pobierz etykiety do wyświetlania informacji o najbliższym przystanku
    var nearbyNameLabel = document.getElementById('nearby-name-label');
    var nearbyDistanceLabel = document.getElementById('nearby-distance-label');

   // Znajdź najbliższy przystanek, który jeszcze nie został osiągnięty przez marker
   var closestStopIndex = stops.findIndex((stop, index) => distances[currentIndex] < markerDistances[index]);

   // Jeśli nie ma już więcej przystanków, zatrzymaj animację
   if (closestStopIndex === -1) {
       clearInterval(interval);
       return;
   }

   // Oblicz odległość do najbliższego przystanku
   var distanceToNextStop = calculateDistance(latlngs[currentIndex], [stops[closestStopIndex].lat, stops[closestStopIndex].lon]);

   // Wyświetl nazwę i odległość do najbliższego przystanku
   nearbyNameLabel.innerText = 'Najbliższy przystanek: ' + stops[closestStopIndex].name;
   nearbyDistanceLabel.innerText = 'Odległość: ' + (distanceToNextStop / 1000).toFixed(2) + ' km';

   // Usuń animację z poprzedniego przystanku
   document.querySelectorAll('.stop-nearby').forEach(function(stop) {
       stop.classList.remove('stop-nearby');
   });

   // Animuj najbliższy przystanek, jeśli marker jest wystarczająco blisko
   if (distanceToNextStop < SOME_THRESHOLD) {
       var stopName = stops[closestStopIndex].name;
       var stopDiv = stopElements[stopName];
       stopDiv.classList.add('stop-nearby');
   }

    currentIndex += 1;
}

function startAnimation() {
    if (!interval) {  // Sprawdź, czy interwał nie jest już aktywny
       
        interval = setInterval(updateMarker, speed);
    }
}



function pauseAnimation() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }
}

function stopAnimation() {
    clearInterval(interval);
    //isAnimating = false;
    currentIndex = 0;
    updateMarker();
}

function nextPoint() {
    console.log(currentIndex);
    //currentIndex += 1;
    if (currentIndex >= latlngs.length) {
        currentIndex = latlngs.length - 1;  // Zatrzymaj na ostatnim punkcie
    }
    updateMarker();
}

function previousPoint() {
    currentIndex -= 2;
    if (currentIndex < 0) {
        currentIndex = 0;  // Zatrzymaj na pierwszym punkcie
    }
    updateMarker();
}

function skipPoint(number) {
    console.log(currentIndex);
    currentIndex += number-1;
    if (currentIndex >= latlngs.length) {
        currentIndex = latlngs.length - 1;  // Zatrzymaj na ostatnim punkcie
    }
    updateMarker();
}

function backPoint(number) {
    currentIndex -= number+1;
    if (currentIndex < 0) {
        currentIndex = 0;  // Zatrzymaj na pierwszym punkcie
    }
    updateMarker();
}

function updateInterval() {
    var speed = document.getElementById('speed-slider').value;
    var speedLabel = document.getElementById('slider-value');
    speedLabel.innerText = speed;
    clearInterval(interval);  // Zatrzymaj obecny interwał
    interval = setInterval(updateMarker, speed);  // Rozpocznij nowy interwał z nową wartością suwaka
}

function updateIndex() {
    // Pobierz wartość suwaka
    var idxValue = document.getElementById('idx-slider').value;
            
    // Aktualizuj wartość wyświetlaną obok suwaka
    document.getElementById('idx-value').textContent = idxValue;

    // Aktualizuj indeks aktualnej pozycji
    currentIndex = parseInt(idxValue, 10);

    // Aktualizuj lokalizację markera na mapie
    var newLatLng = latlngs[currentIndex];
    marker.setLatLng(newLatLng);

    // Oblicz, jak daleko marker jest wzdłuż trasy
    var distanceFromStart = latlngs.slice(0, currentIndex + 1).reduce((total, coords, index, array) => {
        if (index === 0) return 0;
        var prevCoords = array[index - 1];
        return total + map.distance(coords, prevCoords);
    }, 0);

    var percentageAlongLine = (distanceFromStart / totalDistance) * 100;
    
    // Aktualizuj położenie poziomego markera
    horizontalMarker.style.left = percentageAlongLine + '%';
}

// Uruchomienie głównej funkcji po załadowaniu strony
//document.addEventListener('DOMContentLoaded', fetchDataAndInitMap);

// Funkcja do pobierania danych z serwera i inicjalizacji mapy
function fetchDataAndInitMap() {
    return fetch('/app_rik/latlngs')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            // Upewnij się, że pierwszy element tablicy latlngs istnieje i ma dwa elementy
            if (!data.latlngs || !data.latlngs[0] || data.latlngs[0].length !== 2) {
                throw new Error('Invalid latlngs array');
            }
            
            // Użyj pierwszego punktu z latlngs jako początkowej pozycji
            const initialLat = data.latlngs[0][0];
            const initialLng = data.latlngs[0][1];
            initializeMap(initialLat, initialLng, data.latlngs, data.stops, data.realGps);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// Uruchomienie głównej funkcji po załadowaniu strony
document.addEventListener('DOMContentLoaded', function() {
    horizontalMarker = document.getElementById('horizontal-marker');
    fetchDataAndInitMap().then(() => {
        if (!interval) {
            interval = setInterval(updateMarker, speed);
        }
    });
});

