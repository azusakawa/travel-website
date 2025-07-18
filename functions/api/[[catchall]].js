// This is the initial data that will be used to seed the KV store if it's empty.
const initialLocations = [
  {
    "id": "268c940a-724e-414b-a9be-6f12344a67ad",
    "placeId": "ChIJ2Rn0-wRLaTQRkycI7drndEc",
    "name": "彰化田尾波波草",
    "address": "522台灣彰化縣田尾鄉522",
    "link": "https://www.google.com/maps/place/?q=place_id:ChIJ2Rn0-wRLaTQRkycI7drndEc",
    "rating": 4.9,
    "userRatingsTotal": 5468,
    "types": [ "tourist_attraction", "point_of_interest", "establishment" ],
    "latitude": 23.9082917,
    "longitude": 120.5061662
  }
  // ... (The rest of your initial data would be here)
];

// Helper function to get all locations from KV
// It also handles seeding the KV with initial data on the first run.
async function getLocations(context) {
  let locations = await context.env.LOCATIONS_KV.get("all_locations", { type: "json" });
  if (locations === null) {
    // If KV is empty, seed it with the initial data and return it.
    await context.env.LOCATIONS_KV.put("all_locations", JSON.stringify(initialLocations));
    return initialLocations;
  }
  return locations;
}

// Helper function to process and add a single location
async function processAndAddLocation(name, env, locationsCache) {
  const GOOGLE_MAPS_API_KEY = env.GOOGLE_MAPS_API_KEY;

  if (!name) {
    throw new Error("Location name is required");
  }
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    throw new Error("Google Maps API Key is not set");
  }

  const placesApiUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery&fields=place_id,name,formatted_address&key=${GOOGLE_MAPS_API_KEY}`;
  const placesResponse = await fetch(placesApiUrl);
  const placesData = await placesResponse.json();

  if (placesData.status === 'OK' && placesData.candidates.length > 0) {
    const { place_id, name: placeName, formatted_address } = placesData.candidates[0];

    const isDuplicate = locationsCache.some(loc => (loc.placeId && loc.placeId === place_id) || (!loc.placeId && loc.address === formatted_address));
    if (isDuplicate) {
      throw new Error("Location already exists");
    }

    const detailsApiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=rating,user_ratings_total,types,geometry&key=${GOOGLE_MAPS_API_KEY}`;
    const detailsResponse = await fetch(detailsApiUrl);
    const detailsData = await detailsResponse.json();

    let rating = null, userRatingsTotal = null, types = [], latitude = null, longitude = null;
    if (detailsData.status === 'OK' && detailsData.result) {
      const { result } = detailsData;
      rating = result.rating || null;
      userRatingsTotal = result.user_ratings_total || null;
      types = result.types || [];
      if (result.geometry && result.geometry.location) {
        latitude = result.geometry.location.lat;
        longitude = result.geometry.location.lng;
      }
    }

    const googleMapsLink = `https://www.google.com/maps/place/?q=place_id:${place_id}`;
    const newLocation = { id: crypto.randomUUID(), placeId: place_id, name: placeName, address: formatted_address, link: googleMapsLink, rating, userRatingsTotal, types, latitude, longitude };

    return newLocation;
  } else {
    throw new Error("Location not found on Google Maps");
  }
}

const apiRouter = {
  "/api/locations": {
    GET: async ({ env }) => {
      const locations = await getLocations({ env });
      return new Response(JSON.stringify(locations), {
        headers: { "Content-Type": "application/json" },
      });
    },
    POST: async ({ request, env }) => {
      const { name } = await request.json();
      let locationsCache = await getLocations({ env });

      try {
        const newLocation = await processAndAddLocation(name, env, locationsCache);
        locationsCache.push(newLocation);
        await env.LOCATIONS_KV.put("all_locations", JSON.stringify(locationsCache));
        return new Response(JSON.stringify(newLocation), { status: 201, headers: { "Content-Type": "application/json" } });
      } catch (error) {
        console.error('Error adding location:', error.message);
        let status = 500;
        if (error.message === "Location name is required") status = 400;
        else if (error.message === "Location already exists") status = 409;
        else if (error.message === "Location not found on Google Maps") status = 404;
        return new Response(JSON.stringify({ error: error.message }), { status: status, headers: { "Content-Type": "application/json" } });
      }
    },
  },
  "/share": {
    POST: async ({ request, env }) => {
      const { locations } = await request.json();
      let locationsCache = await getLocations({ env });
      const addedLocations = [];
      const errors = [];

      for (const loc of locations) {
        try {
          const newLocation = await processAndAddLocation(loc.name, env, locationsCache);
          locationsCache.push(newLocation);
          addedLocations.push(newLocation);
        } catch (error) {
          console.error(`Error processing location ${loc.name}:`, error.message);
          errors.push({ name: loc.name, error: error.message });
        }
      }

      await env.LOCATIONS_KV.put("all_locations", JSON.stringify(locationsCache));

      if (errors.length > 0) {
        return new Response(JSON.stringify({ message: "Some locations failed to process", added: addedLocations.length, failed: errors.length, errors: errors }), { status: 207, headers: { "Content-Type": "application/json" } }); // 207 Multi-Status
      } else {
        return new Response(JSON.stringify({ message: "All locations processed successfully", added: addedLocations.length }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    },
  },
  "/api/locations/:id": {
    GET: async ({ request, env }) => {
      const id = new URL(request.url).pathname.split('/').pop();
      const locations = await getLocations({ env });
      const location = locations.find(loc => loc.id === id);
      if (location) {
        return new Response(JSON.stringify(location), { headers: { "Content-Type": "application/json" } });
      } else {
        return new Response(JSON.stringify({ error: "Location not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
      }
    },
    DELETE: async ({ request, env }) => {
      const id = new URL(request.url).pathname.split('/').pop();
      let locationsCache = await getLocations({ env });
      const initialLength = locationsCache.length;
      locationsCache = locationsCache.filter(loc => loc.id !== id);

      if (locationsCache.length === initialLength) {
        return new Response(JSON.stringify({ error: "Location not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
      }
      
      await env.LOCATIONS_KV.put("all_locations", JSON.stringify(locationsCache));
      return new Response(JSON.stringify({ message: "Location deleted successfully" }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  },
};

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  let handler;
  let routeFound = false;
  for (const route in apiRouter) {
    const routeMatcher = new RegExp(`^${route.replace(/:\w+/g, '([^/]+)')}// This is the initial data that will be used to seed the KV store if it's empty.
const initialLocations = [
  {
    "id": "268c940a-724e-414b-a9be-6f12344a67ad",
    "placeId": "ChIJ2Rn0-wRLaTQRkycI7drndEc",
    "name": "彰化田尾波波草",
    "address": "522台灣彰化縣田尾鄉522",
    "link": "https://www.google.com/maps/place/?q=place_id:ChIJ2Rn0-wRLaTQRkycI7drndEc",
    "rating": 4.9,
    "userRatingsTotal": 5468,
    "types": [ "tourist_attraction", "point_of_interest", "establishment" ],
    "latitude": 23.9082917,
    "longitude": 120.5061662
  }
  // ... (The rest of your initial data would be here)
];

// Helper function to get all locations from KV
// It also handles seeding the KV with initial data on the first run.
async function getLocations(context) {
  let locations = await context.env.LOCATIONS_KV.get("all_locations", { type: "json" });
  if (locations === null) {
    // If KV is empty, seed it with the initial data and return it.
    await context.env.LOCATIONS_KV.put("all_locations", JSON.stringify(initialLocations));
    return initialLocations;
  }
  return locations;
}

// Helper function to process and add a single location
async function processAndAddLocation(name, env, locationsCache) {
  const GOOGLE_MAPS_API_KEY = env.GOOGLE_MAPS_API_KEY;

  if (!name) {
    throw new Error("Location name is required");
  }
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    throw new Error("Google Maps API Key is not set");
  }

  const placesApiUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery&fields=place_id,name,formatted_address&key=${GOOGLE_MAPS_API_KEY}`;
  const placesResponse = await fetch(placesApiUrl);
  const placesData = await placesResponse.json();

  if (placesData.status === 'OK' && placesData.candidates.length > 0) {
    const { place_id, name: placeName, formatted_address } = placesData.candidates[0];

    const isDuplicate = locationsCache.some(loc => (loc.placeId && loc.placeId === place_id) || (!loc.placeId && loc.address === formatted_address));
    if (isDuplicate) {
      throw new Error("Location already exists");
    }

    const detailsApiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=rating,user_ratings_total,types,geometry&key=${GOOGLE_MAPS_API_KEY}`;
    const detailsResponse = await fetch(detailsApiUrl);
    const detailsData = await detailsResponse.json();

    let rating = null, userRatingsTotal = null, types = [], latitude = null, longitude = null;
    if (detailsData.status === 'OK' && detailsData.result) {
      const { result } = detailsData;
      rating = result.rating || null;
      userRatingsTotal = result.user_ratings_total || null;
      types = result.types || [];
      if (result.geometry && result.geometry.location) {
        latitude = result.geometry.location.lat;
        longitude = result.geometry.location.lng;
      }
    }

    const googleMapsLink = `https://www.google.com/maps/place/?q=place_id:${place_id}`;
    const newLocation = { id: crypto.randomUUID(), placeId: place_id, name: placeName, address: formatted_address, link: googleMapsLink, rating, userRatingsTotal, types, latitude, longitude };

    return newLocation;
  } else {
    throw new Error("Location not found on Google Maps");
  }
}

const apiRouter = {
  "/api/locations": {
    GET: async ({ env }) => {
      const locations = await getLocations({ env });
      return new Response(JSON.stringify(locations), {
        headers: { "Content-Type": "application/json" },
      });
    },
    POST: async ({ request, env }) => {
      const { name } = await request.json();
      let locationsCache = await getLocations({ env });

      try {
        const newLocation = await processAndAddLocation(name, env, locationsCache);
        locationsCache.push(newLocation);
        await env.LOCATIONS_KV.put("all_locations", JSON.stringify(locationsCache));
        return new Response(JSON.stringify(newLocation), { status: 201, headers: { "Content-Type": "application/json" } });
      } catch (error) {
        console.error('Error adding location:', error.message);
        let status = 500;
        if (error.message === "Location name is required") status = 400;
        else if (error.message === "Location already exists") status = 409;
        else if (error.message === "Location not found on Google Maps") status = 404;
        return new Response(JSON.stringify({ error: error.message }), { status: status, headers: { "Content-Type": "application/json" } });
      }
    },
  },
  "/share": {
    POST: async ({ request, env }) => {
      const { locations } = await request.json();
      let locationsCache = await getLocations({ env });
      const addedLocations = [];
      const errors = [];

      for (const loc of locations) {
        try {
          const newLocation = await processAndAddLocation(loc.name, env, locationsCache);
          locationsCache.push(newLocation);
          addedLocations.push(newLocation);
        } catch (error) {
          console.error(`Error processing location ${loc.name}:`, error.message);
          errors.push({ name: loc.name, error: error.message });
        }
      }

      await env.LOCATIONS_KV.put("all_locations", JSON.stringify(locationsCache));

      if (errors.length > 0) {
        return new Response(JSON.stringify({ message: "Some locations failed to process", added: addedLocations.length, failed: errors.length, errors: errors }), { status: 207, headers: { "Content-Type": "application/json" } }); // 207 Multi-Status
      } else {
        return new Response(JSON.stringify({ message: "All locations processed successfully", added: addedLocations.length }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    },
  },
  "/api/locations/:id": {
    GET: async ({ request, env }) => {
      const id = new URL(request.url).pathname.split('/').pop();
      const locations = await getLocations({ env });
      const location = locations.find(loc => loc.id === id);
      if (location) {
        return new Response(JSON.stringify(location), { headers: { "Content-Type": "application/json" } });
      } else {
        return new Response(JSON.stringify({ error: "Location not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
      }
    },
    DELETE: async ({ request, env }) => {
      const id = new URL(request.url).pathname.split('/').pop();
      let locationsCache = await getLocations({ env });
      const initialLength = locationsCache.length;
      locationsCache = locationsCache.filter(loc => loc.id !== id);

      if (locationsCache.length === initialLength) {
        return new Response(JSON.stringify({ error: "Location not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
      }
      
      await env.LOCATIONS_KV.put("all_locations", JSON.stringify(locationsCache));
      return new Response(JSON.stringify({ message: "Location deleted successfully" }), { status: 200, headers: { "Content-Type": "application/json" } });
    },
  },
};

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  let handler;
  let routeFound = false;
  for (const route in apiRouter) {
    );
    if (routeMatcher.test(path)) {
      handler = apiRouter[route][method];
      routeFound = true;
      break;
    }
  }

  if (handler) {
    // Pass the entire context object to the handler
    return await handler(context);
  }

  if (!routeFound) {
    return context.next();
  }

  return new Response("Not found", { status: 404 });
}