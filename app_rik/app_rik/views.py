from django.http import JsonResponse
from django.shortcuts import render
from django.conf import settings
from django.contrib.staticfiles import finders
import os
from .models import BusLocation
import gpxpy
import gpxpy.gpx
import json

stops = [   
    
        {"name": "Mikołajki", "lat": 53.802894, "lon": 21.570573},
        {"name": "Tałty", "lat": 53.823045, "lon": 21.59301},
        {"name": "Woźnice SHR", "lat": 53.846201, "lon": 21.613198},
        {"name": "Pszczółki", "lat": 53.852534, "lon": 21.616421},
        {"name": "Woźnice", "lat": 53.851797, "lon": 21.627089},
        {"name": "Olszewo", "lat": 53.865103, "lon": 21.651274},
        {"name": "Szymonka Kolonia", "lat": 53.885029, "lon": 21.655091},
        {"name": "Szymonka", "lat": 53.895044, "lon": 21.662368},
        {"name": "Prażmowo", "lat": 53.918976, "lon": 21.694779},
        {"name": "Kozin", "lat": 53.947064, "lon": 21.721074},
        {"name": "Bogaczewo", "lat": 53.965145, "lon": 21.743431},
        {"name": "Giżycko", "lat": 54.039174, "lon": 21.769777},
    
]


def index(request):
    latest = BusLocation.objects.latest('timestamp')
    context = {
        'latitude': latest.latitude,
        'longitude': latest.longitude
    }
    return render(request, 'index.html', context)

def routes_and_stops(request):
    # Dane trasy
    route_gpx_filename = 'app_rik/track/generated/mik_giz_1.gpx'
    latlngs = extract_coords(route_gpx_filename)

    # Dane rzeczywistej pozycji GPS
    real_gps_gpx_filename = 'app_rik/track/generated/test_2.gpx'
    realGps = extract_coords(real_gps_gpx_filename)

    data = {
        'latlngs': latlngs,
        'realGps': realGps,
        'stops': stops
    }
    return JsonResponse(data)


# Funkcja do wczytania przystanków z pliku JSON
def load_stops_from_json():
    file_path = finders.find('json/stops.json')
    
    if not file_path:
        return None, 404  # Return None and status code 404 if file not found
    
    with open(file_path, 'r') as file:
        data = json.load(file)
    
    return data, 200  # Return data and status code 200 if successful

def stops_json(request):
    return JsonResponse(stops, safe=False)  # Use safe=False when passing a list instead of a dictionary
    # data, status = load_stops_from_json()
    
    # if status == 404:
    #     return JsonResponse({'error': 'File not found'}, status=status)
    
    # return JsonResponse(data, safe=False)  # Use safe=False when passing a list instead of a dictionary


# Funkcja do wczytania punktów trasy z pliku JSON
def load_routes_from_json():
    with open(f'{settings.BASE_DIR}/routes.json', 'r', encoding='utf-8') as file:
        routes = json.load(file)
    return routes


# Widok zwracający ostatnią lokalizację autobusu w formacie JSON
def latest_location(request):
    latest = BusLocation.objects.latest('timestamp')
    data = {
        'latitude': latest.latitude,
        'longitude': latest.longitude,
        'timestamp': latest.timestamp
    }
    return JsonResponse(data)
    
def extract_coords(gpx_filename):
    with open(gpx_filename, 'r') as gpx_file:
        gpx = gpxpy.parse(gpx_file)

    latlngs = []
    for track in gpx.tracks:
        for segment in track.segments:
            # Pobierz co dwudziesty punkt z segmentu
            for i, point in enumerate(segment.points):
                if i % 1 == 0:
                    latlngs.append([point.latitude, point.longitude])

    return latlngs