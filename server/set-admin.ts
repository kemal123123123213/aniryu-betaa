
import axios from "axios";

async function makeAdmin() {
  try {
    const response = await axios.post("http://0.0.0.0:5000/api/admin/set-role", {
      userId: 1,
      role: "admin"
    }, {
      params: {
        adminToken: "admin123"
      }
    });

    console.log("Sonuç:", response.data);
  } catch (error) {
    console.error("Hata:", error.message);
  }
}

makeAdmin();
