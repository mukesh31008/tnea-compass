/**
 * Approximate geographical coordinates (latitude, longitude) of Tamil Nadu district headquarters/centroids.
 */
export const TN_DISTRICT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Chennai: { lat: 13.0827, lng: 80.2707 },
  Coimbatore: { lat: 11.0168, lng: 76.9558 },
  Madurai: { lat: 9.9252, lng: 78.1198 },
  Tiruchirappalli: { lat: 10.7905, lng: 78.7047 },
  Salem: { lat: 11.6643, lng: 78.146 },
  Tirunelveli: { lat: 8.7139, lng: 77.7567 },
  Chengalpattu: { lat: 12.6819, lng: 79.9888 },
  Kancheepuram: { lat: 12.8342, lng: 79.7036 },
  Thiruvallur: { lat: 13.1432, lng: 79.9083 },
  Vellore: { lat: 12.9165, lng: 79.1325 },
  Erode: { lat: 11.341, lng: 77.7172 },
  Tiruppur: { lat: 11.1085, lng: 77.3411 },
  Thanjavur: { lat: 10.787, lng: 79.1378 },
  Dindigul: { lat: 10.3673, lng: 77.9803 },
  Cuddalore: { lat: 11.748, lng: 79.7714 },
  Villupuram: { lat: 11.9401, lng: 79.4861 },
  Kanyakumari: { lat: 8.0883, lng: 77.5385 },
  Nagapattinam: { lat: 10.7672, lng: 79.8449 },
  Karur: { lat: 10.9601, lng: 78.0766 },
  Namakkal: { lat: 11.2189, lng: 78.1674 },
  Krishnagiri: { lat: 12.5186, lng: 78.2137 },
  Dharmapuri: { lat: 12.1211, lng: 78.1582 },
  Pudukkottai: { lat: 10.3797, lng: 78.8208 },
  Sivaganga: { lat: 9.8433, lng: 78.4809 },
  Ramanathapuram: { lat: 9.3639, lng: 78.8395 },
  Virudhunagar: { lat: 9.5872, lng: 77.9514 },
  Theni: { lat: 10.0104, lng: 77.4768 },
  Thoothukudi: { lat: 8.7642, lng: 78.1348 },
  Tenkasi: { lat: 8.9594, lng: 77.3149 },
  Tirupattur: { lat: 12.4958, lng: 78.5678 },
  Ranipet: { lat: 12.9274, lng: 79.333 },
  Kallakurichi: { lat: 11.7384, lng: 78.9639 },
  Mayiladuthurai: { lat: 11.1075, lng: 79.6523 },
  Ariyalur: { lat: 11.1401, lng: 79.0786 },
  Perambalur: { lat: 11.2342, lng: 78.882 },
  Nilgiris: { lat: 11.4102, lng: 76.695 },
  Tiruvarur: { lat: 10.7725, lng: 79.6365 },
  Tiruvannamalai: { lat: 12.2253, lng: 79.0747 },
};

/**
 * Calculates the great-circle distance between two geographic coordinates using the Haversine formula.
 * @returns Distance in kilometers (km) rounded to 1 decimal place.
 */
export function calculateDistanceKm(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Returns the estimated distance between two Tamil Nadu districts in km.
 */
export function getDistrictDistance(fromDistrict: string, toDistrict: string): number | null {
  const from = TN_DISTRICT_COORDINATES[fromDistrict];
  const to = TN_DISTRICT_COORDINATES[toDistrict];
  if (!from || !to) return null;
  return calculateDistanceKm(from.lat, from.lng, to.lat, to.lng);
}
