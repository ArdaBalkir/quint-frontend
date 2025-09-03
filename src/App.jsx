import React from "react";
import "./App.css";
import Header from "./components/Header";
import { createTheme } from "@mui/material/styles";
import { ThemeProvider } from "@mui/material/styles";
import { TabProvider } from "./contexts/TabContext";
import { NotificationProvider } from "./contexts/NotificationContext";
// TODO Add Token and Auth provider

const theme = createTheme({
  typography: {
    fontFamily: '"Open Sans", "Dosis", "Roboto", sans-serif',
    h1: {
      fontFamily: '"Open Sans", sans-serif',
      fontWeight: 400,
    },
    h2: {
      fontFamily: '"Open Sans", sans-serif',
      fontWeight: 400,
    },
    h3: {
      fontFamily: '"Open Sans", sans-serif',
      fontWeight: 400,
    },
    h4: {
      fontFamily: '"Open Sans", sans-serif',
      fontWeight: 400,
    },
    body1: {
      fontFamily: '"Open Sans", sans-serif',
      fontWeight: 400,
    },
    body2: {
      fontFamily: '"Open Sans", sans-serif',
      fontWeight: 400,
    },
    button: {
      fontFamily: '"Open Sans", sans-serif',
      fontWeight: 400,
    },
    allVariants: {
      color: "#333333",
      fontFamily: '"Open Sans", sans-serif',
      fontWeight: 400,
    },
  },
  palette: {
    mode: "light",
    text: {
      primary: "#333333",
      secondary: "#666666",
      disabled: "#999999",
    },
    primary: {
      main: "#09964fff",
      light: "#94221b",
      dark: "#00904fff",
      contrastText: "#ffffff",
      highlight: "rgba(9, 184, 100, 0.44)",
    },
    secondary: {
      main: "#3fa9f5",
      light: "#0644f4",
      contrastText: "#ffffff",
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <NotificationProvider>
        <TabProvider>
          <div className="App" style={{ width: "100%", height: "100vh" }}>
            <Header />
          </div>
        </TabProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
