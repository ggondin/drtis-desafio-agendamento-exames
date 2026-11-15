import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  cssVariables: { nativeColor: true },
  palette: {
    primary: {
      main: "var(--color-primary)",
      light: "var(--color-focus)",
      dark: "var(--color-primary-hover)",
      contrastText: "var(--color-white)",
    },
    error: {
      main: "var(--color-error)",
      light: "var(--color-error-background)",
      dark: "var(--color-error)",
      contrastText: "var(--color-white)",
    },
  },
  typography: { fontFamily: "var(--font-sans)" },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, boxShadow: "none" },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: "var(--color-surface)",
          color: "var(--color-text)",
        },
      },
    },
    MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "var(--color-input)",
          color: "var(--color-text)",
        },
        notchedOutline: { borderColor: "var(--color-border)" },
      },
    },
  },
});
