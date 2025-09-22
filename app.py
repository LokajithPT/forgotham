from flask import Flask, render_template, request, jsonify
import math
import json

app = Flask(__name__)

# Sample data for drivers (in a real app, this would be in a database)
# Sample data for drivers in Coimbatore
drivers = [
    {"id": 1, "name": "Arun", "lat": 11.0183, "lng": 76.9725, "available": True, "vehicle": "bike"},       # Gandhipuram
    {"id": 2, "name": "Priya", "lat": 11.0055, "lng": 77.0362, "available": True, "vehicle": "auto"},     # Singanallur
    {"id": 3, "name": "Kumar", "lat": 11.0172, "lng": 76.9558, "available": True, "vehicle": "car"},      # Town Hall
    {"id": 4, "name": "Sneha", "lat": 11.0290, "lng": 76.9366, "available": True, "vehicle": "bike"},     # RS Puram
    {"id": 5, "name": "Vijay", "lat": 11.0333, "lng": 77.0417, "available": True, "vehicle": "auto"},     # Peelamedu
    {"id": 6, "name": "Divya", "lat": 10.9985, "lng": 76.9550, "available": True, "vehicle": "bike"},     # Ukkadam
    {"id": 7, "name": "Sathish", "lat": 11.0527, "lng": 77.0266, "available": True, "vehicle": "car"},    # Saravanampatti
]

def calculate_distance(lat1, lng1, lat2, lng2):
    """Calculate distance between two points using Haversine formula"""
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = math.radians(lat1)
    lng1_rad = math.radians(lng1)
    lat2_rad = math.radians(lat2)
    lng2_rad = math.radians(lng2)
    
    dlat = lat2_rad - lat1_rad
    dlng = lng2_rad - lng1_rad
    
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def calculate_fare(distance, vehicle_type):
    """Calculate fare based on distance and vehicle type"""
    base_fare = {"bike": 15, "auto": 25}
    per_km_rate = {"bike": 8, "auto": 12}
    
    fare = base_fare[vehicle_type] + (distance * per_km_rate[vehicle_type])
    return round(fare, 2)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/find_drivers', methods=['POST'])
def find_drivers():
    data = request.get_json()
    pickup_lat = data['pickup_lat']
    pickup_lng = data['pickup_lng']
    
    # Find nearby drivers within 5km radius
    nearby_drivers = []
    for driver in drivers:
        if driver['available']:
            distance = calculate_distance(pickup_lat, pickup_lng, driver['lat'], driver['lng'])
            if distance <= 5:  # Within 5km
                driver_info = driver.copy()
                driver_info['distance_to_pickup'] = round(distance, 2)
                driver_info['eta'] = round(distance * 3, 0)  # Rough ETA in minutes
                nearby_drivers.append(driver_info)
    
    # Sort by distance
    nearby_drivers.sort(key=lambda x: x['distance_to_pickup'])
    
    return jsonify(nearby_drivers[:3])  # Return top 3 nearest drivers

@app.route('/calculate_route', methods=['POST'])
def calculate_route():
    data = request.get_json()
    pickup_lat = data['pickup_lat']
    pickup_lng = data['pickup_lng']
    dest_lat = data['dest_lat']
    dest_lng = data['dest_lng']
    vehicle_type = data.get('vehicle_type', 'bike')
    
    # Calculate distance and fare
    distance = calculate_distance(pickup_lat, pickup_lng, dest_lat, dest_lng)
    fare = calculate_fare(distance, vehicle_type)
    
    # Simulate route points (in real app, you'd use Google Maps API or similar)
    route_points = []
    num_points = 10
    for i in range(num_points + 1):
        ratio = i / num_points
        lat = pickup_lat + (dest_lat - pickup_lat) * ratio
        lng = pickup_lng + (dest_lng - pickup_lng) * ratio
        route_points.append([lat, lng])
    
    return jsonify({
        'distance': round(distance, 2),
        'fare': fare,
        'duration': round(distance * 4, 0),  # Rough duration in minutes
        'route': route_points
    })

@app.route('/book_ride', methods=['POST'])
def book_ride():
    data = request.get_json()
    driver_id = data['driver_id']
    
    # Mark driver as unavailable (in real app, create booking record)
    for driver in drivers:
        if driver['id'] == driver_id:
            driver['available'] = False
            break
    
    return jsonify({
        'status': 'success',
        'message': 'Ride booked successfully!',
        'booking_id': f'RAPID{driver_id}123'
    })

if __name__ == '__main__':
    app.run(debug=True)
