import logger from "../utils/logger.js";
import React, { createContext, useContext, useState } from "react";

const TabContext = createContext();

export const TabProvider = ({ children }) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [nativeSelection, setNativeSelection] = useState({
    native: true,
    app: "workspace",
  });
  const [currentUrl, setCurrentUrl] = useState(null);
  const [validationError, setValidationError] = useState(null);

  const handleFrameChange = (url) => {
    logger.debug("Changing frame", { url });
    setCurrentUrl(url);
    setNativeSelection({
      native: false,
      app: "frame",
    });
  };

  const switchToTab = (tabIndex) => {
    setCurrentTab(tabIndex);
  };

  /**
   * Validates navigation requirements and updates alignment if needed
   * @returns {object} { valid: boolean, error: string }
   */
  const validateNavigation = (customAlignment) => {
    const alignment = customAlignment || localStorage.getItem("alignment");
    const bucketName = localStorage.getItem("bucketName");

    if (!alignment || alignment === "") {
      return {
        valid: false,
        error: "Please select a project and an image series",
      };
    }

    // Update localStorage if custom alignment provided
    if (
      customAlignment &&
      customAlignment !== localStorage.getItem("alignment")
    ) {
      localStorage.setItem("alignment", customAlignment);
    }

    return { valid: true, alignment, bucketName };
  };

  /**
   * Generic navigation handler for external tools
   */
  const navigateToExternalTool = (
    tabIndex,
    urlTemplate,
    customAlignment = null,
  ) => {
    const validation = validateNavigation(customAlignment);

    if (!validation.valid) {
      setValidationError(validation.error);
      logger.warn("Navigation validation failed", {
        error: validation.error,
        tabIndex,
      });
      return false;
    }

    setCurrentTab(tabIndex);
    const url = urlTemplate
      .replace("{bucketName}", validation.bucketName)
      .replace("{alignment}", validation.alignment);
    handleFrameChange(url);
    setValidationError(null);
    return true;
  };

  const navigateToWebAlign = (customAlignment) => {
    return navigateToExternalTool(
      1,
      "https://webalign.apps.ebrains.eu/index.php?clb-collab-id={bucketName}&filename={alignment}",
      customAlignment,
    );
  };

  const navigateToWebWarp = (customAlignment) => {
    return navigateToExternalTool(
      2,
      "https://webwarp.apps.ebrains.eu/webwarp.php?clb-collab-id={bucketName}&filename={alignment}",
      customAlignment,
    );
  };

  const navigateToWebIlastik = () => {
    const bucketName = localStorage.getItem("bucketName");
    const mainPath = JSON.parse(localStorage.getItem("selectedBrain"));
    const token = localStorage.getItem("token");

    if (!bucketName || !mainPath) {
      setValidationError("Please select a project and an image series");
      logger.warn("WebIlastik navigation validation failed");
      return false;
    }

    setCurrentTab(3);

    const workdir = `https://data-proxy.ebrains.eu/api/v1/buckets/${bucketName}/${mainPath.path}`;

    const params = new URLSearchParams({
      workdir,
      token,
      server: "https://app.ilastik.org/api/",
      allocator: "https://app.ilastik.org/allocator",
    });

    const url = `https://app.ilastik.org/app/?${params.toString()}`;
    logger.debug("Ilastik URL", { url });
    handleFrameChange(url);
    setValidationError(null);
    return true;
  };

  const navigateToWebNutil = () => {
    setCurrentTab(4);
    setNativeSelection({
      native: true,
      app: "nutil",
    });
    return true;
  };

  const navigateToMeshView = () => {
    setCurrentTab(5);
    setNativeSelection({
      native: true,
      app: "meshview",
    });
    return true;
  };

  const navigateToSandBox = () => {
    setCurrentTab(6);
    setNativeSelection({
      native: true,
      app: "sandbox",
    });
    return true;
  };

  return (
    <TabContext.Provider
      value={{
        currentTab,
        switchToTab,
        navigateToWebAlign,
        navigateToWebWarp,
        navigateToWebIlastik,
        navigateToWebNutil,
        navigateToMeshView,
        navigateToSandBox,
        nativeSelection,
        setNativeSelection,
        currentUrl,
        handleFrameChange,
        validationError,
        setValidationError,
      }}
    >
      {children}
    </TabContext.Provider>
  );
};

export const useTabContext = () => useContext(TabContext);
