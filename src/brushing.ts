type Listener = (borough: string | null) => void;

let selectedBorough: string | null = null;
const listeners: Listener[] = [];

export function getSelectedBorough(): string | null {
  return selectedBorough;
}

export function setSelectedBorough(borough: string | null): void {
  selectedBorough = borough;
  listeners.forEach(fn => fn(borough));
}

export function onBoroughChange(listener: Listener): void {
  listeners.push(listener);
}
