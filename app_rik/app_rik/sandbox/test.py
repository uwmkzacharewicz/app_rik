import gpxpy
import gpxpy.gpx

# Otwórz plik GPX
with open('your_file.gpx', 'r') as gpx_file:
    gpx = gpxpy.parse(gpx_file)