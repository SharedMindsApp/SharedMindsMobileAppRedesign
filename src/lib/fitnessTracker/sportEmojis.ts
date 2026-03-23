/**
 * Sport Emojis & Visual Identifiers
 * 
 * Maps each sport/activity to a distinctive emoji or visual identifier
 * Designed for neurodivergent users - each sport has a unique, recognizable visual
 */

export const SPORT_EMOJIS: Record<string, string> = {
  // Gym options
  'Cardio machines': '🏃',
  'Free weights': '💪',
  'Machines': '⚙️',
  'Classes': '👥',
  'Mixed / varies': '🔄',
  
  // Running options
  'Casual walking': '🚶',
  'Running (easy pace)': '🏃',
  'Running (structured training)': '🎯',
  'Trail running': '⛰️',
  'Mixed': '🔀',
  
  // Team Sports - Each with unique emoji
  'Football / Soccer': '⚽',
  'American Football': '🏈',
  'Basketball': '🏀',
  'Volleyball': '🏐',
  'Beach Volleyball': '🏖️',
  'Handball': '🤾',
  'Water Polo': '🤽',
  'Rugby Union': '🏉',
  'Rugby League': '🏉',
  'Australian Rules Football': '🏈',
  'Gaelic Football': '🏉',
  'Ice Hockey': '🏒',
  'Field Hockey': '🏑',
  'Roller Hockey': '🏒',
  'Baseball': '⚾',
  'Softball': '🥎',
  'Cricket': '🏏',
  'Ultimate Frisbee': '🥏',
  'Lacrosse': '🥍',
  'Polo': '🐴',
  'Netball': '🏐',
  'Dodgeball': '⚪',
  'Rowing (Team)': '🚣',
  'Roller Derby': '🛼',
  'Korfball': '🏀',
  
  // Individual Sports - Racket Sports
  'Tennis': '🎾',
  'Table Tennis': '🏓',
  'Badminton': '🏸',
  'Squash': '🎾',
  'Racquetball': '🎾',
  'Padel': '🎾',
  'Pickleball': '🏓',
  
  // Individual Sports - Golf & Target
  'Golf': '⛳',
  'Archery': '🏹',
  'Shooting': '🎯',
  'Darts': '🎯',
  
  // Individual Sports - Track & Field & Running
  'Track & Field': '🏃',
  'Sprinting': '💨',
  'Long Distance Running': '🏃‍♂️',
  'Cross-Country Running': '🏃‍♂️',
  'Marathon Running': '🏃‍♂️',
  'Trail Running': '⛰️',
  'Ultra Running': '🏃',
  'High Jump': '🦘',
  'Long Jump': '🦘',
  'Pole Vault': '🏃',
  'Shot Put': '⭕',
  'Discus': '⭕',
  'Javelin': '🏃',
  
  // Individual Sports - Water Sports
  'Diving': '🤿',
  'Surfing': '🏄',
  'Bodyboarding': '🏄',
  'Wakeboarding': '🏄',
  'Kitesurfing': '🪁',
  'Windsurfing': '🏄',
  'Stand Up Paddleboarding (SUP)': '🏄',
  'Open Water Swimming': '🏊',
  
  // Individual Sports - Winter Sports
  'Alpine Skiing': '⛷️',
  'Cross-Country Skiing': '🎿',
  'Snowboarding': '🏂',
  'Figure Skating': '⛸️',
  'Speed Skating': '⛸️',
  'Biathlon': '🎯',
  'Curling': '🧹',
  
  // Individual Sports - Cycling
  'Road Cycling': '🚴',
  'Mountain Biking': '🚵',
  'BMX': '🚴',
  'Indoor Cycling (Spin)': '🚴',
  'Track Cycling': '🚴',
  'Cyclocross': '🚵',
  
  // Individual Sports - Action Sports
  'Skateboarding': '🛹',
  'Roller Skating': '🛼',
  'Inline Skating': '🛼',
  
  // Individual Sports - Equestrian
  'Equestrian': '🐴',
  'Dressage': '🐴',
  'Show Jumping': '🐴',
  'Eventing': '🐴',
  'Riding': '🐴',
  
  // Individual Sports - Gymnastics & Dance
  'Gymnastics': '🤸',
  'Artistic Gymnastics': '🤸',
  'Rhythmic Gymnastics': '🎀',
  'Trampolining': '🦘',
  'Dance Sport': '💃',
  
  // Individual Sports - Combat/Fighting
  'Boxing (Individual)': '🥊',
  'Karate': '🥋',
  'Taekwondo': '🥋',
  'Fencing': '⚔️',
  'Wrestling (Individual)': '🤼',
  'Judo (Individual)': '🥋',
  'Brazilian Jiu-Jitsu (Competition)': '🥋',
  'Muay Thai (Individual)': '🥋',
  'Kickboxing (Individual)': '🥊',
  'MMA (Individual)': '🥊',
  'Sambo': '🥋',
  'Krav Maga': '🥋',
  
  // Individual Sports - Climbing & Mountaineering
  'Rock Climbing': '🧗',
  'Bouldering': '🧗',
  'Mountaineering': '⛰️',
  'Parkour': '🏃',
  'Freerunning': '🏃',
  
  // Individual Sports - Strength & Conditioning
  'Weightlifting': '🏋️',
  'Powerlifting': '🏋️',
  'Strongman': '💪',
  'CrossFit': '🔥',
  'Functional Fitness': '💪',
  'Calisthenics': '🤸',
  'Pilates': '🧘',
  'Kettlebell Training': '⚖️',
  'TRX / Suspension Training': '💪',
  'Circuit Training': '🔄',
  
  // Individual Sports - Fitness Classes
  'HIIT': '⚡',
  'Aerobics': '💃',
  'Step Aerobics': '📋',
  'Zumba': '💃',
  'Dance Fitness': '💃',
  'Water Aerobics': '🏊',
  
  // Individual Sports - Multi-Sport & Adventure
  'Triathlon': '🏊',
  'Duathlon': '🏃',
  'Aquathlon': '🏊',
  'Adventure Racing': '🗺️',
  'Obstacle Course Racing (OCR)': '🏔️',
  'Orienteering': '🧭',
  
  // Martial Arts
  'Brazilian Jiu-Jitsu (BJJ)': '🥋',
  'Boxing': '🥊',
  'Wrestling': '🤼',
  'Muay Thai': '🥋',
  'Kickboxing': '🥊',
  'Judo': '🥋',
  'Mixed / MMA': '🥊',
  
  // Other
  'Other': '➕',
};

/**
 * Get emoji for a sport/activity
 */
export function getSportEmoji(option: string): string {
  return SPORT_EMOJIS[option] || '⚪';
}
