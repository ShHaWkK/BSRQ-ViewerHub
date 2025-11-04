// Extraction de l'ID YouTube depuis une URL ou un ID brut
export function extractVideoId(input) {
  if (!input) return null;
  const regexList = [
    /(?:v=|\/videos\/|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/, 
    /^([a-zA-Z0-9_-]{11})$/ // ID brut
  ];
  for (const r of regexList) {
    const match = input.match(r);
    if (match && match[1]) return match[1];
  }
  return null;
}

// Génère un label automatique à partir de l'URL ou de l'ID YouTube
export function generateAutoLabel(input) {
  if (!input) return 'Flux YouTube';
  
  // Si c'est une URL, essayer d'extraire des informations utiles
  if (input.includes('youtube.com') || input.includes('youtu.be')) {
    // Extraire le nom du canal si présent dans l'URL
    const channelMatch = input.match(/\/c\/([^\/\?]+)/);
    if (channelMatch) {
      return `Canal: ${decodeURIComponent(channelMatch[1])}`;
    }
    
    // Extraire le nom d'utilisateur si présent
    const userMatch = input.match(/\/user\/([^\/\?]+)/);
    if (userMatch) {
      return `Utilisateur: ${decodeURIComponent(userMatch[1])}`;
    }
    
    // Pour les vidéos, utiliser l'ID
    const videoId = extractVideoId(input);
    if (videoId) {
      return `Vidéo: ${videoId}`;
    }
  }
  
  // Si c'est juste un ID, l'utiliser directement
  const videoId = extractVideoId(input);
  if (videoId) {
    return `Vidéo: ${videoId}`;
  }
  
  return 'Flux YouTube';
}
