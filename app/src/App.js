import React from 'react';
import './App.css';
import Header from './components/Header';
import { createTheme } from '@mui/material/styles';
import { ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  typography: {
    fontFamily: 'Open Sans, sans-serif',
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#8000FF',
      light: '#94221b',
      dark: '#00a595',
    },
    secondary: {
      main: '#3fa9f5',
      light: '#0644f4',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <div className="App">
        <Header />
      </div>
    </ThemeProvider>
  );
}

export default App;
