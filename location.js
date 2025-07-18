const API_URL = 'http://localhost:3000/api/locations';

const typeMap = {
    'place_of_worship': '宗教場所',
    'accounting': '會計',
    'airport': '機場',
    'amusement_park': '遊樂園',
    'aquarium': '水族館',
    'art_gallery': '美術館',
    'atm': '自動櫃員機',
    'bakery': '麵包店',
    'bank': '銀行',
    'bar': '酒吧',
    'beauty_salon': '美容院',
    'bicycle_store': '自行車店',
    'book_store': '書店',
    'bowling_alley': '保齡球館',
    'bus_station': '公車站',
    'cafe': '咖啡廳',
    'campground': '露營地',
    'car_dealer': '汽車經銷商',
    'car_rental': '租車',
    'car_repair': '汽車維修',
    'car_wash': '洗車',
    'casino': '賭場',
    'cemetery': '墓地',
    'church': '教堂',
    'city_hall': '市政廳',
    'clothing_store': '服飾店',
    'convenience_store': '便利商店',
    'courthouse': '法院',
    'dentist': '牙醫',
    'department_store': '百貨公司',
    'doctor': '醫生',
    'drugstore': '藥妝店',
    'electrician': '電工',
    'electronics_store': '電子產品店',
    'embassy': '大使館',
    'establishment': '機構',
    'fire_station': '消防局',
    'florist': '花店',
    'food': '食品',
    'funeral_home': '殯儀館',
    'furniture_store': '家具店',
    'gas_station': '加油站',
    'gym': '健身房',
    'hair_care': '美髮',
    'hardware_store': '五金行',
    'hindu_temple': '印度教寺廟',
    'home_goods_store': '家居用品店',
    'hospital': '醫院',
    'insurance_agency': '保險公司',
    'jewelry_store': '珠寶店',
    'laundry': '洗衣店',
    'lawyer': '律師',
    'library': '圖書館',
    'light_rail_station': '輕軌站',
    'liquor_store': '酒類專賣店',
    'local_government_office': '地方政府機關',
    'locksmith': '鎖匠',
    'lodging': '住宿',
    'meal_delivery': '餐點外送',
    'meal_takeaway': '外帶餐點',
    'mosque': '清真寺',
    'movie_rental': '電影租賃',
    'movie_theater': '電影院',
    'moving_company': '搬家公司',
    'museum': '博物館',
    'natural_feature': '自然景點',
    'night_club': '夜店',
    'painter': '油漆工',
    'park': '公園',
    'parking': '停車場',
    'pet_store': '寵物店',
    'pharmacy': '藥局',
    'physiotherapist': '物理治療師',
    'plumber': '水管工',
    'point_of_interest': '興趣點',
    'police': '警察局',
    'post_office': '郵局',
    'primary_school': '小學',
    'real_estate_agency': '房地產仲介',
    'restaurant': '餐廳',
    'route': '路線',
    'roofing_contractor': '屋頂承包商',
    'rv_park': '露營車公園',
    'school': '學校',
    'secondary_school': '中學',
    'shoe_store': '鞋店',
    'shopping_mall': '購物中心',
    'spa': '水療中心',
    'stadium': '體育場',
    'storage': '倉儲',
    'store': '商店',
    'subway_station': '捷運站',
    'supermarket': '超級市場',
    'synagogue': '猶太教堂',
    'taxi_stand': '計程車招呼站',
    'tourist_attraction': '旅遊景點',
    'train_station': '火車站',
    'transit_station': '大眾運輸站',
    'travel_agency': '旅行社',
    'university': '大學',
    'veterinary_care': '獸醫',
    'zoo': '動物園'
};

const getStarRatingHtml = (rating) => {
    let stars = '';
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    if (halfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    return stars;
};

const formatPlaceTypes = (types) => {
    if (!types || types.length === 0) {
        return 'N/A';
    }
    // Simple mapping for common types, otherwise just capitalize and replace underscores
    const formattedTypes = types.map(type => {
        if (typeMap[type]) {
            return typeMap[type];
        } else {
            return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    });

    return formattedTypes.join(', ');
};

const displayLocationDetails = (location) => {
    document.getElementById('location-name').textContent = location.name;
    document.getElementById('location-address').textContent = location.address;
    document.getElementById('location-types').textContent = `類型: ${formatPlaceTypes(location.types)}`;

    if (location.rating && location.userRatingsTotal) {
        const ratingContainer = document.getElementById('location-rating');
        const starsHtml = getStarRatingHtml(location.rating);
        ratingContainer.innerHTML = `<strong>${location.rating}</strong> ${starsHtml} (${location.userRatingsTotal})`;
    }

    const map = new google.maps.Map(document.getElementById('map'), {
        zoom: 15,
        center: { lat: location.latitude, lng: location.longitude },
        mapId: 'DEMO_MAP_ID'
    });

    new google.maps.marker.AdvancedMarkerElement({
        position: { lat: location.latitude, lng: location.longitude },
        map: map,
        title: location.name
    });
};

const getLocationDetails = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const locationId = urlParams.get('id');

    if (locationId) {
        try {
            const response = await fetch(`${API_URL}/${locationId}`);
            const location = await response.json();
            displayLocationDetails(location);
        } catch (error) {
            console.error('Error fetching location details:', error);
        }
    }
};

function initMap() {
    getLocationDetails();
}