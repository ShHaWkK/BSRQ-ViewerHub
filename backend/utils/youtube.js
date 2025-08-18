// Extraction de l'ID YouTube depuis une URL ou un ID brut
export function extractVideoId(input) {
  if (!input) return null;
  const regexList = [
    /(?:v=|\/videos\/|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/, // URL classiques
    /^([a-zA-Z0-9_-]{11})$/ // ID brut
  ];
  for (const r of regexList) {
    const match = input.match(r);
    if (match && match[1]) return match[1];
  }
  return null;
}
