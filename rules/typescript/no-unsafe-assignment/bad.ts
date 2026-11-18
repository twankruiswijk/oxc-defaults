export function readSettings(text: string): Settings {
  const settings = JSON.parse(text);

  return settings;
}

interface Settings {
  theme: string;
}
