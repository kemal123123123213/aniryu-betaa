
import fetch from "node-fetch";

async function makeAdmin() {
  try {
    const response = await fetch("http://localhost:5000/api/admin/set-role?adminToken=admin123", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: 1,
        role: "admin"
      })
    });

    const result = await response.json();
    console.log("Sonuç:", result);
  } catch (error) {
    console.error("Hata:", error);
  }
}

makeAdmin();
