/**
 * Comprehensive Sport Definitions
 * 
 * Defines all available sports for team and individual sports domains
 * Each sport will create a separate activity
 */

export const TEAM_SPORTS = [
  // Ball Sports
  'Football / Soccer',
  'American Football',
  'Basketball',
  'Volleyball',
  'Beach Volleyball',
  'Handball',
  'Water Polo',
  
  // Rugby & Similar
  'Rugby Union',
  'Rugby League',
  'Australian Rules Football',
  'Gaelic Football',
  
  // Hockey Variants
  'Ice Hockey',
  'Field Hockey',
  'Roller Hockey',
  'Inline Hockey',
  
  // Baseball & Cricket
  'Baseball',
  'Softball',
  'Cricket',
  
  // Other Team Sports
  'Ultimate Frisbee',
  'Lacrosse',
  'Polo',
  'Korfball',
  'Netball',
  'Dodgeball',
  'Kickball',
  'Rounders',
  'Kabaddi',
  
  // Rowing & Paddling Teams
  'Rowing (Team)',
  'Dragon Boat',
  'Canoe Polo',
  
  // Other
  'Other',
];

export const INDIVIDUAL_SPORTS = [
  // Racket Sports
  'Tennis',
  'Table Tennis',
  'Badminton',
  'Squash',
  'Racquetball',
  'Padel',
  'Pickleball',
  
  // Golf & Target Sports
  'Golf',
  'Archery',
  'Shooting',
  'Darts',
  
  // Combat Sports (Individual)
  'Fencing',
  'Boxing (Individual)',
  'Karate',
  'Taekwondo',
  
  // Track & Field
  'Track & Field',
  'Sprinting',
  'Long Distance Running',
  'High Jump',
  'Long Jump',
  'Pole Vault',
  'Shot Put',
  'Discus',
  'Javelin',
  'Decathlon',
  'Triathlon',
  
  // Water Sports (Individual)
  'Diving',
  'Surfing',
  'Bodyboarding',
  'Wakeboarding',
  'Water Skiing',
  'Kitesurfing',
  'Windsurfing',
  'Stand Up Paddleboarding (SUP)',
  'Open Water Swimming',
  
  // Winter Sports
  'Alpine Skiing',
  'Cross-Country Skiing',
  'Snowboarding',
  'Figure Skating',
  'Speed Skating',
  'Biathlon',
  'Curling',
  
  // Combat Sports / Martial Arts (Individual Competition)
  'Wrestling (Individual)',
  'Judo (Individual)',
  'Brazilian Jiu-Jitsu (Competition)',
  
  // Cycling (Individual Competition)
  'Road Cycling',
  'Mountain Biking',
  'BMX',
  'Track Cycling',
  'Cyclocross',
  
  // Equestrian
  'Equestrian',
  'Dressage',
  'Show Jumping',
  'Eventing',
  'Riding',
  
  // Gymnastics & Dance
  'Gymnastics',
  'Artistic Gymnastics',
  'Rhythmic Gymnastics',
  'Trampolining',
  'Parkour',
  'Freerunning',
  'Dance Sport',
  
  // Other Individual Sports
  'Rock Climbing',
  'Bouldering',
  'Mountaineering',
  'Weightlifting',
  'Powerlifting',
  'Strongman',
  'CrossFit',
  'Functional Fitness',
  'Calisthenics',
  'Ultra Running',
  'Marathon Running',
  'Trail Running',
  'Adventure Racing',
  'Orienteering',
  'Duathlon',
  'Aquathlon',
  
  // Combat Sports / Fighting
  'Muay Thai (Individual)',
  'Kickboxing (Individual)',
  'MMA (Individual)',
  'Sambo',
  'Krav Maga',
  
  // Other
  'Other',
];

/**
 * Get sport metadata (icon, color) for a specific sport
 */
export function getSportMetadata(sport: string): {
  icon: string;
  color: string;
} {
  const sportLower = sport.toLowerCase();
  
  // Team Sports Icons
  if (sportLower.includes('football') || sportLower.includes('soccer')) {
    return { icon: 'Circle', color: '#7C3AED' }; // Purple
  }
  if (sportLower.includes('basketball')) {
    return { icon: 'CircleDot', color: '#EA580C' }; // Orange
  }
  if (sportLower.includes('rugby')) {
    return { icon: 'Circle', color: '#059669' }; // Green
  }
  if (sportLower.includes('volleyball')) {
    return { icon: 'CircleDot', color: '#0284C7' }; // Blue
  }
  if (sportLower.includes('hockey')) {
    return { icon: 'Zap', color: '#DC2626' }; // Red
  }
  if (sportLower.includes('baseball') || sportLower.includes('softball') || sportLower.includes('cricket')) {
    return { icon: 'Circle', color: '#EA580C' }; // Orange
  }
  
  // Individual Sports Icons
  if (sportLower.includes('tennis')) {
    return { icon: 'CircleDot', color: '#C026D3' }; // Fuchsia
  }
  if (sportLower.includes('golf')) {
    return { icon: 'CircleDot', color: '#059669' }; // Green
  }
  if (sportLower.includes('badminton') || sportLower.includes('squash') || sportLower.includes('racquetball') || sportLower.includes('padel') || sportLower.includes('pickleball')) {
    return { icon: 'CircleDot', color: '#0284C7' }; // Blue
  }
  if (sportLower.includes('cycling') || sportLower.includes('bike')) {
    return { icon: 'Bike', color: '#059669' }; // Green
  }
  if (sportLower.includes('surfing') || sportLower.includes('paddle') || sportLower.includes('kitesurf') || sportLower.includes('windsurf')) {
    return { icon: 'Waves', color: '#0284C7' }; // Blue
  }
  if (sportLower.includes('skiing') || sportLower.includes('snowboard')) {
    return { icon: 'Mountain', color: '#60A5FA' }; // Light Blue
  }
  if (sportLower.includes('climbing') || sportLower.includes('bouldering') || sportLower.includes('mountaineering')) {
    return { icon: 'Mountain', color: '#DC2626' }; // Red
  }
  if (sportLower.includes('running') || sportLower.includes('marathon') || sportLower.includes('sprint')) {
    return { icon: 'Footprints', color: '#EA580C' }; // Orange
  }
  if (sportLower.includes('gymnastics') || sportLower.includes('parkour') || sportLower.includes('calisthenics')) {
    return { icon: 'Target', color: '#C026D3' }; // Fuchsia
  }
  if (sportLower.includes('archery') || sportLower.includes('shooting') || sportLower.includes('darts')) {
    return { icon: 'Target', color: '#DC2626' }; // Red
  }
  if (sportLower.includes('fencing')) {
    return { icon: 'Sword', color: '#0284C7' }; // Blue
  }
  if (sportLower.includes('equestrian') || sportLower.includes('riding')) {
    return { icon: 'Zap', color: '#059669' }; // Green
  }
  if (sportLower.includes('weightlifting') || sportLower.includes('powerlifting') || sportLower.includes('strongman') || sportLower.includes('crossfit')) {
    return { icon: 'Dumbbell', color: '#DC2626' }; // Red
  }
  
  // Default
  return { icon: 'Target', color: '#6B7280' }; // Gray
}
