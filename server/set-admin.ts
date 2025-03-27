
import { storage } from "./storage";

async function makeAdmin() {
  try {
    // Kemal kullanıcısını bul
    const user = await storage.getUserByUsername("kemal");
    
    if (!user) {
      console.error("Kullanıcı bulunamadı");
      return;
    }

    // Admin rolünü ata
    const updatedUser = await storage.updateUser(user.id, { role: "admin" });
    console.log("Admin rolü başarıyla atandı:", updatedUser);
  } catch (error) {
    console.error("Hata:", error);
  }
}

makeAdmin();
