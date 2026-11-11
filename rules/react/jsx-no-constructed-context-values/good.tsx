import { createContext, type ReactNode, useMemo, useState } from 'react';

const ThemeContext = createContext({ dark: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const theme = useMemo(() => ({ dark, toggle: () => setDark(!dark) }), [dark]);

  return <ThemeContext value={theme}>{children}</ThemeContext>;
}
