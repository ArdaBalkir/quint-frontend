import React, { Component } from "react";
import { Box, Typography, Button, Alert } from "@mui/material";
import logger from "../utils/logger.js";

/**
 * Error Boundary component to catch and display React errors gracefully
 * Prevents entire app from crashing when a component throws an error
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error("React Error Boundary caught an error", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Optionally reload the page
    if (this.props.resetOnRetry) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "400px",
            p: 4,
            gap: 2,
          }}
        >
          <Alert severity="error" sx={{ maxWidth: 600 }}>
            <Typography variant="h6" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body2" gutterBottom>
              {this.state.error?.message || "An unexpected error occurred"}
            </Typography>
            {process.env.NODE_ENV === "development" && this.state.errorInfo && (
              <Typography
                variant="caption"
                component="pre"
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: "grey.100",
                  borderRadius: 1,
                  overflow: "auto",
                  maxHeight: 200,
                  fontSize: "0.7rem",
                }}
              >
                {this.state.errorInfo.componentStack}
              </Typography>
            )}
          </Alert>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="contained" onClick={this.handleReset}>
              {this.props.resetOnRetry ? "Reload Page" : "Try Again"}
            </Button>
            {this.props.onReset && (
              <Button variant="outlined" onClick={this.props.onReset}>
                Go Back
              </Button>
            )}
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
