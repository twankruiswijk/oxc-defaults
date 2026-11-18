export function readSettings(text: string): Settings {
  const parsed: unknown = JSON.parse(text);
  if (!isSettings(parsed)) {
    throw new Error('Settings need a theme');
  }

  return parsed;
}

interface Settings {
  theme: string;
}

function isSettings(value: unknown): value is Settings {
  return typeof value === 'object' && value !== null && 'theme' in value && typeof value.theme === 'string';
}
