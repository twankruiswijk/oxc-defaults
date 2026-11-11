import { createContext, type ReactNode, useState } from 'react';

const ThemeContext = createContext({ dark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);

  return <ThemeContext value={{ dark, toggle: () => setDark(!dark) }}>{children}</ThemeContext>;
}
