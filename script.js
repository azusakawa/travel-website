const shareForm = document.getElementById('share-form');
const locationNameInput = document.getElementById('location-name');
const listsContainer = document.getElementById('lists-container');
const locationSelect = document.getElementById('location-select');
const locationFileInput = document.getElementById('location-file-input');
const fileUploadFeedback = document.getElementById('file-upload-feedback');
const loadingSpinner = document.getElementById('loading-spinner');
const regionFilterSelect = document.getElementById('region-filter');
const sortByRatingSelect = document.getElementById('sort-by-rating');
const minRatingFilterSelect = document.getElementById('min-rating-filter');
const typeFilterSelect = document.getElementById('type-filter');
const searchKeywordInput = document.getElementById('search-keyword');
const sortByNameSelect = document.getElementById('sort-by-name');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfoSpan = document.getElementById('page-info');
const itemsPerPageSelect = document.getElementById('items-per-page');

const API_URL = '/api/locations';

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

let allLocations = [];
let taiwanRegions = [];
let currentPage = 1;
let itemsPerPage = 10;

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
    const formattedTypes = types.map(type => {
        if (typeMap[type]) {
            return typeMap[type];
        } else {
            return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    });

    return formattedTypes[0];
};

const setFormEnabled = (enabled) => {
    locationNameInput.disabled = !enabled;
    locationSelect.disabled = !enabled;
    shareForm.querySelector('button[type="submit"]').disabled = !enabled;
    locationFileInput.disabled = !enabled;
};

const applyFiltersAndSort = (locationsToFilter) => {
    const selectedRegion = regionFilterSelect.value;
    const selectedType = typeFilterSelect.value;
    const searchKeyword = searchKeywordInput.value.toLowerCase();
    const selectedSortOrder = sortByRatingSelect.value;
    const selectedSortByName = sortByNameSelect.value;
    const minRating = parseFloat(minRatingFilterSelect.value);

    let filteredLocations = locationsToFilter;

    if (selectedRegion !== 'all') {
        filteredLocations = filteredLocations.filter(location => {
            if (location && typeof location === 'object' && location.address) {
                return location.address.includes(selectedRegion);
            }
            return false;
        });
    }

    if (selectedType !== 'all') {
        filteredLocations = filteredLocations.filter(location => {
            if (location && location.types && location.types.length > 0) {
                return location.types.includes(selectedType);
            }
            return false;
        });
    }

    if (searchKeyword) {
        filteredLocations = filteredLocations.filter(location => {
            const name = location.name ? location.name.toLowerCase() : '';
            const address = location.address ? location.address.toLowerCase() : '';
            return name.includes(searchKeyword) || address.includes(searchKeyword);
        });
    }

    if (minRating > 0) {
        filteredLocations = filteredLocations.filter(location => {
            const currentRating = parseFloat(location.rating);
            return !isNaN(currentRating) && currentRating >= minRating;
        });
    }

    if (selectedSortOrder !== 'none') {
        filteredLocations.sort((a, b) => {
            const ratingA = a.rating || 0;
            const ratingB = b.rating || 0;

            if (selectedSortOrder === 'high-to-low') {
                return ratingB - ratingA;
            } else if (selectedSortOrder === 'low-to-high') {
                return ratingA - ratingB;
            }
            return 0;
        });
    } else if (selectedSortByName !== 'none') {
        filteredLocations.sort((a, b) => {
            const nameA = a.name ? a.name.toLowerCase() : '';
            const nameB = b.name ? b.name.toLowerCase() : '';

            if (selectedSortByName === 'a-z') {
                return nameA.localeCompare(nameB);
            } else if (selectedSortByName === 'z-a') {
                return nameB.localeCompare(nameA);
            }
            return 0;
        });
    }

    const totalPages = Math.ceil(filteredLocations.length / parseInt(itemsPerPageSelect.value));
    const startIndex = (currentPage - 1) * parseInt(itemsPerPageSelect.value);
    const endIndex = startIndex + parseInt(itemsPerPageSelect.value);
    const paginatedLocations = filteredLocations.slice(startIndex, endIndex);

    displayLists(paginatedLocations);
    updatePaginationControls(filteredLocations.length, totalPages);
};

const updatePaginationControls = (totalItems, totalPages) => {
    pageInfoSpan.textContent = `第 ${currentPage} 頁，共 ${totalPages} 頁`;

    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
};

locationFileInput.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (files.length === 0) {
        return;
    }

    setFormEnabled(false);
    loadingSpinner.style.display = 'block';
    fileUploadFeedback.textContent = '';

    const allLocations = [];
    const filePromises = [];
    const selectedLocation = locationSelect.value;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        filePromises.push(new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const fileContent = event.target.result;
                const locationsFromFile = fileContent.split('\n')
                    .map(line => line.trim())
                    .filter(line => line !== '');
                
                for (const line of locationsFromFile) {
                    allLocations.push({ name: `${selectedLocation} - ${line}` });
                }
                resolve();
            };
            reader.onerror = (error) => {
                console.error(`Error reading file ${file.name}:`, error);
                reject(error);
            };
            reader.readAsText(file);
        }));
    }

    try {
        await Promise.all(filePromises);

        if (allLocations.length > 0) {
            console.log('Sending locations:', allLocations);
            const response = await fetch('/api/locations/share', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ locations: allLocations })
            });

            if (response.ok) {
                fileUploadFeedback.textContent = `${allLocations.length} 個地點已成功分享！`;
                fileUploadFeedback.style.color = 'green';
                getLists(); // Refresh the lists after successful sharing
            } else {
                const errorText = await response.text();
                throw new Error(`Failed to share locations: ${errorText}`);
            }
        } else {
            fileUploadFeedback.textContent = '沒有地點可分享。';
            fileUploadFeedback.style.color = 'orange';
        }
    } catch (error) {
        console.error('Error processing files:', error);
        fileUploadFeedback.textContent = '處理檔案時發生錯誤。';
        fileUploadFeedback.style.color = 'red';
    } finally {
        loadingSpinner.style.display = 'none';
        setFormEnabled(true);
        e.target.value = ''; // Clear the file input
    }
});

let map; // Global map object
let markers = []; // Array to store map markers

// Function to initialize and add the map
function initMap() {
    // The map, centered at Taiwan
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 8,
        center: { lat: 23.6978, lng: 120.9605 }, // Center of Taiwan
        mapId: 'DEMO_MAP_ID' // Add a map ID
    });
    getLists();
}

// Function to dynamically load Google Maps script
async function loadGoogleMapsScript() {
    try {
        const response = await fetch('/api/google-maps-key');
        const data = await response.json();
        if (data.apiKey) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&callback=initMap&libraries=marker&loading=async`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        } else {
            console.error('Failed to get Google Maps API key from backend.');
        }
    } catch (error) {
        console.error('Error fetching Google Maps API key:', error);
    }
}

// Call the function to load Google Maps script when the page loads
document.addEventListener('DOMContentLoaded', loadGoogleMapsScript);

const getLists = async () => {
    try {
        const response = await fetch(API_URL);
        allLocations = await response.json();
        await populateLocations();
        applyFiltersAndSort(allLocations);
    } catch (error) {
        console.error('Error fetching locations:', error);
    }
};

const populateLocations = async () => {
    try {
        const response = await fetch('taiwan-districts.json');
        const locations = await response.json();
        taiwanRegions = locations;

        // Clear existing options before populating
        locationSelect.innerHTML = '';
        regionFilterSelect.innerHTML = '';
        typeFilterSelect.innerHTML = '';

        // Populate locationSelect dropdown
        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            locationSelect.appendChild(option);
        });

        // Populate regionFilterSelect dropdown
        const allRegionsOption = document.createElement('option');
        allRegionsOption.value = 'all';
        allRegionsOption.textContent = '所有地區';
        regionFilterSelect.appendChild(allRegionsOption);

        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            regionFilterSelect.appendChild(option);
        });

        // Populate typeFilterSelect dropdown
        const allTypesOption = document.createElement('option');
        allTypesOption.value = 'all';
        allTypesOption.textContent = '所有類型';
        typeFilterSelect.appendChild(allTypesOption);

        const uniqueTypes = [...new Set(allLocations.flatMap(loc => loc.types || []))];
        uniqueTypes.sort().forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            typeFilterSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error in populateLocations:', error);
    }
};

const addLocation = async (name) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });
        const newLocation = await response.json();
        getLists();
    } catch (error) {
        console.error('Error adding location:', error);
    }
};

const deleteLocation = async (id) => {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            getLists();
        } else {
            console.error('Failed to delete location:', response.statusText);
        }
    } catch (error) {
        console.error('Error deleting location:', error);
    }
};

const displayLists = (locations) => {
    listsContainer.innerHTML = '';
    const regions = {};

    markers.forEach(marker => marker.setMap(null));
    markers = [];
    const bounds = new google.maps.LatLngBounds();

    locations.forEach(location => {
        if (location && typeof location === 'object' && location.id) {
            let regionName = '未分類';
            for (const region of taiwanRegions) {
                if (location.address.includes(region)) {
                    regionName = region;
                    break;
                }
            }

            if (!regions[regionName]) {
                const regionDiv = document.createElement('div');
                regionDiv.classList.add('region-group');

                const regionTitle = document.createElement('h3');
                regionTitle.textContent = regionName;
                regionDiv.appendChild(regionTitle);

                const regionList = document.createElement('ul');
                regionList.classList.add('region-list');
                regionDiv.appendChild(regionList);

                listsContainer.appendChild(regionDiv);
                regions[regionName] = regionList;
            }

            const locationDiv = document.createElement('li');
            locationDiv.classList.add('shared-list-item');

            const parts = location.name.split(' - ');
            const nameTitle = document.createElement('h4');
            const nameLink = document.createElement('a');
            nameLink.href = `location.html?id=${location.id}`;
            nameLink.textContent = parts.length > 1 ? parts.slice(1).join(' - ') : location.name;
            nameTitle.appendChild(nameLink);
            locationDiv.appendChild(nameTitle);

            const addressParagraph = document.createElement('p');
            const fullAddress = location.address;
            const displayAddress = fullAddress.length > 40 ? fullAddress.substring(0, 37) + '...' : fullAddress;
            addressParagraph.innerHTML = '<i class="fas fa-map-marker-alt"></i> ' + displayAddress;
            addressParagraph.title = fullAddress;
            locationDiv.appendChild(addressParagraph);

            if (location.types && location.types.length > 0) {
                const typesParagraph = document.createElement('p');
                typesParagraph.classList.add('location-types');
                typesParagraph.textContent = `類型: ${formatPlaceTypes(location.types)}`;
                locationDiv.appendChild(typesParagraph);
            }

            if (location.rating && location.userRatingsTotal) {
                const ratingContainer = document.createElement('div');
                ratingContainer.classList.add('location-rating');

                const starsHtml = getStarRatingHtml(location.rating);
                ratingContainer.innerHTML = `<strong>${location.rating}</strong> ${starsHtml} (${location.userRatingsTotal})`;
                locationDiv.appendChild(ratingContainer);
            }

            if (location.link) {
                locationDiv.style.cursor = 'pointer';
                locationDiv.addEventListener('click', () => {
                    window.open(location.link, '_blank');
                });
            }

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '刪除';
            deleteButton.classList.add('delete-btn');
            deleteButton.addEventListener('click', (event) => {
                event.stopPropagation();
                deleteLocation(location.id);
            });
            locationDiv.appendChild(deleteButton);

            regions[regionName].appendChild(locationDiv);

            if (location.latitude && location.longitude) {
                const position = { lat: location.latitude, lng: location.longitude };
                const marker = new google.maps.marker.AdvancedMarkerElement({
                    position: position,
                    map: map,
                    content: new google.maps.marker.PinElement({glyph: location.name.charAt(0), background: '#FBBC04', borderColor: '#1E88E5', glyphColor: '#1E88E5'}).element,
                });
                markers.push(marker);
                bounds.extend(position);

                const infoWindow = new google.maps.InfoWindow({
                    content: `<h3>${location.name}</h3><p>${location.address}</p>`
                });

                marker.addListener('click', () => {
                    infoWindow.open(map, marker);
                });
            }
        }
    });

    if (markers.length > 0) {
        map.fitBounds(bounds);
    }
};


shareForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (locationFileInput.files.length > 0) {
        return;
    }

    const locationName = locationNameInput.value;
    const selectedLocation = locationSelect.value;

    if (locationName) {
        addLocation(`${selectedLocation} - ${locationName}`);
        locationNameInput.value = '';
    }
});

regionFilterSelect.addEventListener('change', () => {
    currentPage = 1;
    applyFiltersAndSort(allLocations);
});
typeFilterSelect.addEventListener('change', () => {
    currentPage = 1;
    applyFiltersAndSort(allLocations);
});
searchKeywordInput.addEventListener('input', () => {
    currentPage = 1;
    applyFiltersAndSort(allLocations);
});
sortByRatingSelect.addEventListener('change', () => {
    currentPage = 1;
    applyFiltersAndSort(allLocations);
});
sortByNameSelect.addEventListener('change', () => {
    currentPage = 1;
    applyFiltersAndSort(allLocations);
});
minRatingFilterSelect.addEventListener('change', () => {
    currentPage = 1;
    applyFiltersAndSort(allLocations);
});

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        applyFiltersAndSort(allLocations);
    }
});

nextPageBtn.addEventListener('click', () => {
    currentPage++;
    applyFiltersAndSort(allLocations);
});

itemsPerPageSelect.addEventListener('change', () => {
    currentPage = 1;
    applyFiltersAndSort(allLocations);
});