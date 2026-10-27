#!/usr/bin/env python3
"""Builds vedic-pandit-client/src/app/core/data/districts.json (state -> district -> lat/lng).

Source: DataMeet "Maps of India", 2011 census district boundaries (CC BY 2.5 India)
        https://github.com/datameet/maps  (Districts/Census_2011/2011_Dist.geojson)
Usage:  python3 tools/build_districts.py path/to/2011_Dist.geojson

Each district point is the centroid of its boundary, or the town itself for the well-known cities below
(sunrise moves by about 4 minutes per degree of longitude, so a centroid is within a minute or two for
almost every district). Names are updated to today's names and states (Telangana, Ladakh, renamed districts).
"""
import json, math, os, sys

STATE_FIX = {
    'Andaman & Nicobar Island': 'Andaman & Nicobar Islands', 'Arunanchal Pradesh': 'Arunachal Pradesh',
    'Dadara & Nagar Havelli': 'Dadra & Nagar Haveli and Daman & Diu', 'Daman & Diu': 'Dadra & Nagar Haveli and Daman & Diu',
    'NCT of Delhi': 'Delhi',
}
TELANGANA = {'Adilabad', 'Nizamabad', 'Karimnagar', 'Medak', 'Hyderabad', 'Rangareddy', 'Mahbubnagar', 'Nalgonda', 'Warangal', 'Khammam'}
LADAKH = {'Kargil', 'Leh (ladakh)'}

STATE_HI = {
    'Andaman & Nicobar Islands': 'अंडमान और निकोबार', 'Andhra Pradesh': 'आंध्र प्रदेश', 'Arunachal Pradesh': 'अरुणाचल प्रदेश',
    'Assam': 'असम', 'Bihar': 'बिहार', 'Chandigarh': 'चंडीगढ़', 'Chhattisgarh': 'छत्तीसगढ़',
    'Dadra & Nagar Haveli and Daman & Diu': 'दादरा नगर हवेली और दमन दीव', 'Delhi': 'दिल्ली', 'Goa': 'गोवा',
    'Gujarat': 'गुजरात', 'Haryana': 'हरियाणा', 'Himachal Pradesh': 'हिमाचल प्रदेश', 'Jammu & Kashmir': 'जम्मू और कश्मीर',
    'Jharkhand': 'झारखंड', 'Karnataka': 'कर्नाटक', 'Kerala': 'केरल', 'Ladakh': 'लद्दाख', 'Lakshadweep': 'लक्षद्वीप',
    'Madhya Pradesh': 'मध्य प्रदेश', 'Maharashtra': 'महाराष्ट्र', 'Manipur': 'मणिपुर', 'Meghalaya': 'मेघालय',
    'Mizoram': 'मिज़ोरम', 'Nagaland': 'नागालैंड', 'Odisha': 'ओडिशा', 'Puducherry': 'पुदुच्चेरी', 'Punjab': 'पंजाब',
    'Rajasthan': 'राजस्थान', 'Sikkim': 'सिक्किम', 'Tamil Nadu': 'तमिलनाडु', 'Telangana': 'तेलंगाना', 'Tripura': 'त्रिपुरा',
    'Uttar Pradesh': 'उत्तर प्रदेश', 'Uttarakhand': 'उत्तराखंड', 'West Bengal': 'पश्चिम बंगाल',
}

# (state, old name) or old name -> current name
RENAME = {
    'Y.s.r.': 'YSR Kadapa', 'Sri Potti Sriramulu Nellore': 'Nellore', 'Leh (ladakh)': 'Leh', 'Kaimur (bhabua)': 'Kaimur',
    'Saran (chhapra)': 'Saran', 'Janjgir-champa': 'Janjgir-Champa', 'Saraikela-kharsawan': 'Seraikela-Kharsawan',
    'Ahmadabad': 'Ahmedabad', 'Dohad': 'Dahod', 'Kachchh': 'Kutch', 'Mahesana': 'Mehsana', 'Panch Mahals': 'Panchmahal',
    'Banas Kantha': 'Banaskantha', 'Sabar Kantha': 'Sabarkantha', 'Gurgaon': 'Gurugram', 'Mewat': 'Nuh',
    'Bangalore': 'Bengaluru Urban', 'Bangalore Rural': 'Bengaluru Rural', 'Belgaum': 'Belagavi', 'Bellary': 'Ballari',
    ('Karnataka', 'Bijapur'): 'Vijayapura', 'Gulbarga': 'Kalaburagi', 'Mysore': 'Mysuru', 'Shimoga': 'Shivamogga',
    'Tumkur': 'Tumakuru', 'Chikmagalur': 'Chikkamagaluru', 'Chamrajnagar': 'Chamarajanagar',
    'Hoshangabad': 'Narmadapuram', 'East Nimar': 'Khandwa', 'West Nimar': 'Khargone', 'Narsimhapur': 'Narsinghpur',
    'Ahmadnagar': 'Ahilyanagar', ('Maharashtra', 'Aurangabad'): 'Chhatrapati Sambhajinagar', 'Osmanabad': 'Dharashiv',
    'Bid': 'Beed', 'Buldana': 'Buldhana', 'Garhchiroli': 'Gadchiroli', 'Gondiya': 'Gondia', ('Maharashtra', 'Raigarh'): 'Raigad',
    'Mumbai': 'Mumbai City', 'Anugul': 'Angul', 'Baleshwar': 'Balasore', 'Bauda': 'Boudh', 'Debagarh': 'Deogarh',
    'Jajapur': 'Jajpur', 'Kendujhar': 'Keonjhar', 'Nabarangapur': 'Nabarangpur', 'Khordha': 'Khordha (Bhubaneswar)',
    'Sahibzada Ajit Singh Nagar': 'Mohali (SAS Nagar)', 'Shahid Bhagat Singh Nagar': 'Nawanshahr (SBS Nagar)',
    'Muktsar': 'Sri Muktsar Sahib', 'Chittaurgarh': 'Chittorgarh', 'Dhaulpur': 'Dholpur', 'Jhunjhunun': 'Jhunjhunu',
    'Jalor': 'Jalore', 'Ganganagar': 'Sri Ganganagar', 'Allahabad': 'Prayagraj', 'Faizabad': 'Ayodhya',
    'Bara Banki': 'Barabanki', 'Jyotiba Phule Nagar': 'Amroha', 'Kansiram Nagar': 'Kasganj', 'Mahamaya Nagar': 'Hathras',
    'Sant Ravi Das Nagar(bhadohi)': 'Bhadohi', 'Kheri': 'Lakhimpur Kheri', 'Shrawasti': 'Shravasti',
    'Gautam Buddha Nagar': 'Gautam Buddha Nagar (Noida)', 'Hardwar': 'Haridwar', 'Garhwal': 'Pauri Garhwal',
    'Barddhaman': 'Bardhaman', 'Darjiling': 'Darjeeling', 'Haora': 'Howrah', 'Hugli': 'Hooghly', 'Koch Bihar': 'Cooch Behar',
    'Maldah': 'Malda', 'Puruliya': 'Purulia', 'Kancheepuram': 'Kanchipuram', 'Kanniyakumari': 'Kanyakumari',
    'Nagappattinam': 'Nagapattinam', 'Thoothukkudi': 'Thoothukudi', 'Viluppuram': 'Villupuram', 'Virudunagar': 'Virudhunagar',
    'Kabeerdham': 'Kabirdham', 'Dakshin Bastar Dantewada': 'Dantewada', 'Uttar Bastar Kanker': 'Kanker',
    'Marigaon': 'Morigaon', 'Lawangtlai': 'Lawngtlai', 'Kodarma': 'Koderma', 'Pashchimi Singhbhum': 'West Singhbhum',
    'Purbi Singhbhum': 'East Singhbhum (Jamshedpur)', 'Pashchim Champaran': 'West Champaran', 'Purba Champaran': 'East Champaran',
    'Lahul & Spiti': 'Lahaul & Spiti', 'Punch': 'Poonch', 'Baramula': 'Baramulla', 'Badgam': 'Budgam', 'Shupiyan': 'Shopian',
    'Kamrup Metropolitan': 'Kamrup Metropolitan (Guwahati)', 'Dadra & Nagar Haveli': 'Dadra & Nagar Haveli',
}
DELHI = {'Central', 'East', 'North', 'North East', 'North West', 'South', 'South West', 'West'}
SIKKIM = {'East': 'East Sikkim (Gangtok)', 'North': 'North Sikkim', 'South': 'South Sikkim', 'West': 'West Sikkim'}

# The town itself for well-known places (lat, lng)
TOWN = {
    'Varanasi': (25.3176, 82.9739), 'Haridwar': (29.9457, 78.1642), 'Ujjain': (23.1765, 75.7885), 'Ayodhya': (26.7922, 82.1998),
    'Mathura': (27.4924, 77.6737), 'Prayagraj': (25.4358, 81.8463), 'Mumbai City': (18.9388, 72.8354),
    'Bengaluru Urban': (12.9716, 77.5946), 'Chennai': (13.0827, 80.2707), 'Hyderabad': (17.385, 78.4867),
    'Kolkata': (22.5726, 88.3639), 'Ahmedabad': (23.0225, 72.5714), 'Pune': (18.5204, 73.8567), 'Jaipur': (26.9124, 75.7873),
    'Lucknow': (26.8467, 80.9462), 'Patna': (25.5941, 85.1376), 'Kamrup Metropolitan (Guwahati)': (26.1445, 91.7362),
    'Thiruvananthapuram': (8.5241, 76.9366), 'New Delhi': (28.6139, 77.209), 'Khordha (Bhubaneswar)': (20.2961, 85.8245),
    'Dehradun': (30.3165, 78.0322), 'Nashik': (19.9975, 73.7898), 'Puri': (19.8135, 85.8312), 'Madurai': (9.9252, 78.1198),
    'Gaya': (24.7955, 85.0002), 'Kurukshetra': (29.9695, 76.8783), 'Chandigarh': (30.7333, 76.7794),
    'Bhopal': (23.2599, 77.4126), 'Indore': (22.7196, 75.8577), 'Nagpur': (21.1458, 79.0882), 'Surat': (21.1702, 72.8311),
    'Kanpur Nagar': (26.4499, 80.3319), 'Agra': (27.1767, 78.0081), 'Amritsar': (31.634, 74.8723), 'Ranchi': (23.3441, 85.3096),
    'Raipur': (21.2514, 81.6296), 'Visakhapatnam': (17.6868, 83.2185), 'Coimbatore': (11.0168, 76.9558), 'Mysuru': (12.2958, 76.6394),
    'Ernakulam': (9.9816, 76.2999), 'Thrissur': (10.5276, 76.2144), 'Jammu': (32.7266, 74.857), 'Srinagar': (34.0837, 74.7973),
    'Shimla': (31.1048, 77.1734), 'Rajkot': (22.3039, 70.8022), 'Vadodara': (22.3072, 73.1812), 'Jodhpur': (26.2389, 73.0243),
    'Udaipur': (24.5854, 73.7125), 'Gorakhpur': (26.7606, 83.3732), 'Darbhanga': (26.1542, 85.8918), 'Bhagalpur': (25.2425, 86.9842),
    'Deoghar': (24.4826, 86.6948), 'Nalgonda': (17.0575, 79.2671), 'Warangal': (17.9689, 79.5941),
}

def ring_centroid(ring):
    a = cx = cy = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        f = x1 * y2 - x2 * y1
        a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f
    if abs(a) < 1e-12:
        xs, ys = zip(*ring); return sum(xs) / len(xs), sum(ys) / len(ys), 0.0
    return cx / (3 * a), cy / (3 * a), abs(a) / 2

def centroid(geom):
    polys = [geom['coordinates']] if geom['type'] == 'Polygon' else geom['coordinates']
    sx = sy = sa = 0.0
    for poly in polys:
        x, y, a = ring_centroid([tuple(p[:2]) for p in poly[0]])
        sx += x * a; sy += y * a; sa += a
    return (sy / sa, sx / sa) if sa else (0, 0)

def main(path):
    data = json.load(open(path, encoding='utf-8'))
    states = {}
    for f in data['features']:
        p = f['properties']; st = p['ST_NM']; d = p['DISTRICT']
        if d == 'Data Not Available': continue
        st = STATE_FIX.get(st, st)
        if st == 'Andhra Pradesh' and d in TELANGANA: st = 'Telangana'
        if st == 'Jammu & Kashmir' and d in LADAKH: st = 'Ladakh'
        name = RENAME.get((st, d)) or RENAME.get(d) or d
        if st == 'Delhi' and d in DELHI: name = f'{d} Delhi'
        if st == 'Sikkim': name = SIKKIM.get(d, d)
        lat, lng = TOWN.get(name) or centroid(f['geometry'])
        states.setdefault(st, []).append([name, round(lat, 3), round(lng, 3)])
    out = [{'n': s, 'h': STATE_HI.get(s, s), 'd': sorted(v, key=lambda r: r[0])} for s, v in sorted(states.items())]
    missing = [s for s in states if s not in STATE_HI]
    assert not missing, missing
    dest = os.path.join(os.path.dirname(__file__), '..', 'vedic-pandit-client', 'src', 'app', 'core', 'data', 'districts.json')
    json.dump({'source': 'DataMeet Maps of India, Census 2011 districts (CC BY 2.5 India), names updated', 'states': out},
              open(dest, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f'{len(out)} states/UTs, {sum(len(s["d"]) for s in out)} districts -> {os.path.normpath(dest)}')

if __name__ == '__main__':
    main(sys.argv[1])
