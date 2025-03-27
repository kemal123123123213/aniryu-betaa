
import { storage } from "./storage";

async function makeAdmin() {
  // Kullanıcı ID'nizi buraya girin
  const userId = 1; // Varsayılan demo kullanıcı ID'si
  
  try {
    const updatedUser = await storage.updateUser(userId, { role: "admin" });
    console.log("Admin rolü başarıyla atandı:", updatedUser);
  } catch (error) {
    console.error("Hata:", error);
  }
}

makeAdmin();
