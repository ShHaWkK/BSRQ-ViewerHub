// Génère un identifiant simple en base36
export function genId() {
  return Math.random().toString(36).substring(2, 10);
}
