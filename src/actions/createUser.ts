import logger from "../utils/logger.js";
const API = import.meta.env.VITE_APP_API;
interface UserInfo {
  username: string;
  fullname: string;
  email: string;
  [key: string]: any;
}

function createUser(token: string): UserInfo {
  try {
    // Get the payload part of the JWT (second part)
    const payloadBase64 = token.split(".")[1];

    const decodedPayload = atob(payloadBase64);
    const payload = JSON.parse(decodedPayload);

    // Map the JWT fields to our UserInfo structure
    const userInfo: UserInfo = {
      username: payload.preferred_username || "",
      fullname: payload.name || "",
      email: payload.email || "",
    };

    logger.info("User created", { sub: userInfo.sub });
    localStorage.setItem("userInfo", JSON.stringify(userInfo));

    return userInfo;
  } catch (error) {
    logger.error("Error parsing JWT token", error);
    throw error;
  }
}

async function checkAgreement(
  fullName: string,
  email: string
): Promise<boolean> {
  try {
    // Normalize using NFC for consistent character representation
    const normalizedFullName = fullName.normalize("NFC").trim();
    const normalizedEmail = email.trim().toLowerCase();

    const url = new URL(`${API}/check-signature`);
    url.searchParams.set("email", normalizedEmail);
    url.searchParams.set("fullname", normalizedFullName);

    logger.debug("Checking agreement for", {
      originalFullName: fullName,
      normalizedFullName,
      email: normalizedEmail,
      finalUrl: url.toString(),
    });

    const response = await fetch(url.toString(), {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(
        `Network response was not ok: ${response.status} ${response.statusText}`
      );
    }
    logger.debug("Agreement response status", {
      status: response.status,
      url: url.toString(),
    });
    const data = await response.json();
    return data.signed;
  } catch (error) {
    logger.error("Error checking agreement", { error, fullName, email });
    return false;
  }
}

async function signDocument(token: string): Promise<void> {
  try {
    const url = new URL(`${API}/sign-document`);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: token }),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    logger.info("Document signed successfully");
  } catch (error) {
    logger.error("Error signing document", error);
    throw error; // Re-throw to allow caller to handle the error
  }
}

export { createUser, checkAgreement, signDocument };
