/** Última vez que se usó la app, para decidir si hay que volver a pedir el PIN. */
const LAST_ACTIVE_KEY = "boveda:ultima-actividad";

export function readLastActive(): number | null {
  try {
    const value = Number(localStorage.getItem(LAST_ACTIVE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function markActive(now = Date.now()): void {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(now));
  } catch {
    // Sin almacenamiento la app pedirá el PIN cada vez, que es lo más seguro.
  }
}

export function clearActivity(): void {
  try {
    localStorage.removeItem(LAST_ACTIVE_KEY);
    sessionStorage.clear();
  } catch {
    // Nada que limpiar.
  }
}
