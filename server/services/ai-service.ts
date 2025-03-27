import { User } from '@shared/schema';
import { storage } from '../storage';

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class AIService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenAI API key is not set');
    }
  }

  private async makeOpenAIRequest(
    prompt: string,
    systemMessage: string = 'You are a helpful anime recommendation assistant.'
  ): Promise<string> {
    try {
      // Check if we have a valid API key before making the request
      if (!this.apiKey || this.apiKey === '') {
        // If no API key provided, return appropriate demo content based on the prompt type
        return this.generateDemoContent(prompt, systemMessage);
      }
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: systemMessage
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.warn(`OpenAI API error: ${error}`);
        // Fallback to demo content
        return this.generateDemoContent(prompt, systemMessage);
      }

      const data = await response.json() as OpenAIResponse;
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error making OpenAI request:', error);
      return this.generateDemoContent(prompt, systemMessage);
    }
  }
  
  /**
   * Generates demo content when API isn't available
   */
  private generateDemoContent(prompt: string, systemMessage: string): string {
    console.log("Uyarı: OpenAI API'ye bağlanılamadı, demo içerik kullanılıyor");
    
    // Personalized recommendations
    if (prompt.includes('kişiselleştirilmiş anime önerisi ver') || prompt.includes('öneri')) {
      return `# Kişiselleştirilmiş Anime Önerileri

1. **Attack on Titan (Shingeki no Kyojin)** - İzleme geçmişinize göre aksiyon ve dram türlerinden hoşlandığınızı görüyorum. Bu anime, insanlığın dev yaratıklara karşı verdiği mücadeleyi konu alır ve hem aksiyon hem de derin karakter gelişimleri sunar.

2. **Demon Slayer (Kimetsu no Yaiba)** - Görsel kalitesi, aksiyon sahneleri ve duygusal hikâyesiyle son yılların en popüler animelerinden biridir. Güçlü karakter gelişimi ve etkileyici savaş sahneleriyle sizi içine çekecektir.

3. **Fullmetal Alchemist: Brotherhood** - Simya dünyasında geçen bu anime, kardeşlik, fedakarlık ve insanlık gibi temaları işleyen, mükemmel bir hikâye anlatımına sahiptir. Tercih ettiğiniz türlerle mükemmel bir uyum sağlar.

4. **Steins;Gate** - Bilim kurgu seviyorsanız, zaman yolculuğu temalı bu anime sizi şaşırtacak derinlikte bir hikaye sunuyor. Karakterlerin gelişimi ve hikâyedeki sürprizler sizi ekrana bağlayacak.

5. **Violet Evergarden** - Düşündürücü, duygusal ve görsel açıdan büyüleyici bir seri. Savaş sonrası travması yaşayan bir askerin duygusal yolculuğunu anlatan bu anime, izleme alışkanlıklarınıza göre size hitap edecektir.

6. **Jujutsu Kaisen** - Büyüleyici aksiyon sahneleri ve ilginç karakterleriyle modern animenin en iyi örneklerinden biri. Süpernatürel güçler ve karanlık temaları, zengin bir hikaye anlatımıyla birleştiriyor.

7. **Vinland Saga** - Vikingleri konu alan bu tarihi anime, intikam ve barış temaları etrafında dönen derin bir hikaye sunuyor. Animasyon kalitesi ve karakter gelişimiyle büyüleyici bir deneyim.

8. **Mob Psycho 100** - Psişik güçlere sahip bir öğrencinin hayatını konu alan bu anime, hem komik hem duygusal anlarıyla dikkat çekiyor. Kendini keşfetme ve büyüme temalarını mükemmel işliyor.

9. **Re:Zero − Starting Life in Another World** - İsekai türünün en iyi örneklerinden biri olan bu anime, ölüm sonrası zamanda geri dönebilen bir karakterin dramını anlatıyor. Psikolojik derinliği ve karmaşık hikaye anlatımıyla dikkat çekiyor.

10. **Made in Abyss** - Masalsı görünümünün altında karanlık temaları işleyen bu anime, uçsuz bucaksız bir deliği keşfeden çocukların hikayesini anlatıyor. Görsel açıdan muhteşem ve duygusal olarak etkileyici.`;
    }
    
    // What to watch today
    if (prompt.includes('bugün izlemesi gereken bir anime öner')) {
      return `🌟 **Bugün İzlemeniz İçin: Mushoku Tensei: Jobless Reincarnation**

Bu anime, bugünkü ruh halinize tam olarak uyacak bir yapım. İsekai (başka dünyaya aktarılma) türünün en iyi örneklerinden biri olan Mushoku Tensei, yeniden doğuş ve kendini keşfetme temasını derin bir şekilde işliyor.

Bugün kendinizi biraz maceracı ve keşfe açık hissediyorsanız, bu anime tam size göre. Zengin bir fantezi dünyası, iyi yazılmış karakterler ve etkileyici animasyonu ile sizi uzun saatler ekrana kilitleyecek.

Ayrıca hem komedi hem dram öğeleri barındırdığı için, gün içinde yaşadığınız karışık duygulara hitap edecektir. Ana karakterin hatalarıyla yüzleşip kendini geliştirme yolculuğu size ilham verebilir.

Bugünkü moralinizi yükseltecek ve sizi farklı bir dünyaya götürecek mükemmel bir seçim!`;
    }
    
    // Anime analysis - summary
    if (prompt.includes('hakkında 150-200 kelimelik düşündürücü') || prompt.includes('analiz') || prompt.includes('özet')) {
      const animeTitle = prompt.match(/"([^"]+)"/)?.[1] || "bu anime";
      return `"${animeTitle}" modern anime dünyasının en etkileyici yapıtlarından biridir. Hikâye, karmaşık karakterler ve derin temaları harmanlayarak izleyiciye sıradan bir anime deneyiminin ötesinde bir yolculuk sunar.

Eserin en dikkat çekici yanı, evrensel temaları Japon kültürü ve mitolojisiyle ustaca harmanlama biçimidir. Dostluk, fedakârlık ve kendini keşfetme gibi evrensel konuları işlerken, izleyiciyi hem duygusal hem de felsefi bir yolculuğa çıkarır.

Animenin görsel dili de en az hikâyesi kadar etkileyicidir. Akıcı animasyon sekansları, detaylı arka planlar ve karakterlerin duygu yüklü yüz ifadeleri, hikâyenin anlatımını güçlendiren unsurlardır.

Bu yapıt sadece bir anime değil, aynı zamanda insanlık durumuna dair derin bir incelemedir. Karakterlerin karşılaştığı zorluklar ve verdikleri kararlar, izleyiciyi kendi hayatları hakkında düşünmeye sevk eder. Bu yönüyle "${animeTitle}", sadece eğlendirmekle kalmayıp düşündüren, nadir rastlanan animelerden biridir.`;
    }
    
    // Character analysis
    if (prompt.includes('karakterlerin kişilik analizi yap') || prompt.includes('karakter')) {
      const animeTitle = prompt.match(/"([^"]+)"/)?.[1] || "bu anime";
      return `## "${animeTitle}" Karakter Analizi

### Ana Karakter
Serinin protagonisti, güçlü bir adalet duygusu ve derin bir empati yeteneğiyle öne çıkar. Geçmişinde yaşadığı travmalar, karakterin davranışlarını ve kararlarını derinden etkiler. En büyük güçlü yanı, zorluklarla karşılaştığında asla pes etmemesi ve sürekli kendini geliştirme arzusudur. Ancak, başkalarını koruma içgüdüsü bazen kendisini tehlikeye atmasına neden olur. Motivasyonu, sevdiklerini korumak ve dünyada gerçek bir değişim yaratmaktır.

### Deuteragonist (İkincil Karakter)
Bu karakter, ana karakterin tam tersi bir kişilik sergiler. Soğukkanlı, hesaplayıcı ve pragmatiktir. Geçmişindeki kayıplar, duygularını gizleme ve rasyonel düşünme eğilimini güçlendirmiştir. Güçlü yanı, kritik durumlarda bile sakin kalabilmesi ve stratejik düşünebilmesidir. Zayıflığı ise, duygusal bağlar kurmakta zorlanması ve bazen amaçlarına ulaşmak için etik olmayan yollara başvurmasıdır. İçindeki boşluğu doldurma ve kendini kanıtlama arzusu, temel motivasyonunu oluşturur.

### Antagonist (Karşıt Karakter)
Serinin kötü karakteri olarak görülse de, aslında karmaşık bir arka plana sahiptir. Eylemleri kötücül görünse de, kendi bakış açısından haklı nedenlere dayanır. Güçlü yanı, inanılmaz zekâsı ve kararlılığıdır. Zayıflığı ise, geçmişindeki travmalar nedeniyle dünyayı çarpık bir şekilde algılaması ve empati kuramamasıdır. Motivasyonu, kendince adaleti sağlamak ve kendi acılarını dindirmektir.

### Destekleyici Karakter
Genellikle komik anlar sağlayan bu karakter, aslında grubun duygusal çapasıdır. Görünüşteki neşeli tavrının altında, derin bir sadakat ve fedakârlık yatar. Güçlü yanı, zorlu zamanlarda bile umut ve neşeyi kaybetmemesidir. Zayıflığı, kendini değersiz görmesi ve bazen kendi ihtiyaçlarını göz ardı etmesidir. En büyük motivasyonu, sevdiklerinin mutluluğu ve huzurudur.`;
    }
    
    // Default response if no specific content type is matched
    return `Anime dünyasında yapabileceğiniz keşifler sınırsızdır! Farklı türlerde birçok yüksek kaliteli yapım bulunuyor. Aksiyon, macera, romantik komedi, bilim kurgu veya fantastik türlerden hangisini tercih ederseniz edin, sizin zevkinize hitap edecek animeler mutlaka vardır.

Kendinize uygun bir anime seçmek için öncelikle ilgi alanlarınızı düşünün. Örneğin, karmaşık hikayeler ve felsefi konular ilginizi çekiyorsa "Attack on Titan" veya "Death Note" gibi yapımlar size uygun olabilir. Daha hafif ve eğlenceli içerikler arıyorsanız "Spy x Family" veya "Kaguya-sama: Love is War" gibi yapımlar tercih edilebilir.

İşte izleyebileceğiniz popüler anime önerileri:

1. **One Piece** - Uzun soluklu macera
2. **Naruto** - Ninja dünyasında geçen epik yolculuk
3. **My Hero Academia** - Süper kahramanlık hikayesi
4. **Tokyo Revengers** - Zamanda yolculuk ve çeteler
5. **Haikyuu!!** - Voleybol tutkusu
6. **Your Lie in April** - Duygusal müzik hikayesi
7. **Hunter x Hunter** - Karmaşık güç sistemleri ve maceraları
8. **Death Note** - Psikolojik gerilim
9. **Chainsaw Man** - Modern şeytanlarla mücadele
10. **Weathering With You** - Doğaüstü romantik hikaye

Anime izlemek sadece bir eğlence değil, aynı zamanda farklı kültürleri ve bakış açılarını tanıma fırsatı sunar. İyi seyirler!`;
  }

  /**
   * Kullanıcının izleme geçmişini analiz ederek kişiselleştirilmiş öneriler sunar
   */
  async getPersonalizedRecommendations(userId: number): Promise<string> {
    // Kullanıcının izleme geçmişini al
    const watchHistory = await storage.getWatchHistory(userId);
    const user = await storage.getUser(userId);

    if (!watchHistory.length) {
      return this.makeOpenAIRequest(
        'Bir yeni anime izleyicisi için genel anime önerileri ver. Önerileri 5 ile sınırlandır ve her biri için kısa bir açıklama ekle.',
        'Sen bir anime uzmanısın. Yeni başlayan izleyicilere popüler ve beğenilen animeleri öneriyorsun. Türkçe yanıt ver.'
      );
    }

    // İzleme geçmişinden anime ID'lerini çıkar
    const animeIds = watchHistory.map(h => h.animeId);
    const uniqueAnimeIds = Array.from(new Set(animeIds));

    // Kullanıcı tercihlerini de ekle
    const preferences = await storage.getUserPreferences(userId);

    let prompt = `Kullanıcı ${user?.username || 'bu kişi'} şu anime ID'lerini izledi: ${uniqueAnimeIds.join(', ')}. `;
    
    if (preferences) {
      prompt += `Kullanıcının tercihleri: ${preferences.genres?.join(', ') || 'belirtilmemiş'}. `;
      prompt += `Tercih ettiği dil: ${preferences.subtitleLanguage || 'belirtilmemiş'}. `;
    }
    
    prompt += 'Bu kullanıcı için 5 kişiselleştirilmiş anime önerisi ver. Her öneri için kısa bir açıklama ekle ve neden bu animeyi sevebileceğini belirt.';

    return this.makeOpenAIRequest(
      prompt,
      'Sen bir anime uzmanısın. Kullanıcıların izleme alışkanlıklarına göre kişiselleştirilmiş öneriler sunuyorsun. Türkçe yanıt ver.'
    );
  }

  /**
   * "Bugün Ne İzlemeliyim?" özelliği için rastgele bir anime önerisi sunar
   */
  async getWhatToWatchToday(userId: number): Promise<string> {
    const user = await storage.getUser(userId);
    const preferences = await storage.getUserPreferences(userId);

    let prompt = `${user?.username || 'Bir kullanıcı'} için bugün izlemesi gereken bir anime öner. `;
    
    if (preferences) {
      prompt += `Kullanıcının tercihleri: ${preferences.genres?.join(', ') || 'belirtilmemiş'}. `;
    }
    
    prompt += 'Sadece bir anime öner ve neden bugün bu animeyi izlemesi gerektiğine dair ikna edici bir açıklama yap.';

    return this.makeOpenAIRequest(
      prompt,
      'Sen anime ve ruh hali konusunda uzman bir asistansın. Günün ruh haline ve enerjisine uygun en iyi animeyi öneriyorsun. Türkçe yanıt ver.'
    );
  }

  /**
   * Belirli bir anime hakkında AI tarafından oluşturulmuş özet ve analiz sunar
   */
  async getAnimeAnalysis(animeId: number, animeTitle: string, genres: string[]): Promise<{
    summary: string;
    characterAnalysis: string;
  }> {
    // Anime özeti için prompt
    const summaryPrompt = `"${animeTitle}" adlı anime hakkında 150-200 kelimelik düşündürücü ve ilgi çekici bir özet yaz. Türler: ${genres.join(', ')}.`;
    
    // Karakter analizi için prompt
    const characterPrompt = `"${animeTitle}" adlı animedeki ana karakterlerin kişilik analizi yap. Her karakter için güçlü yönleri, zayıflıkları ve motivasyonları hakkında kısa bilgiler ver.`;

    // Parallel API calls for better performance
    const [summary, characterAnalysis] = await Promise.all([
      this.makeOpenAIRequest(
        summaryPrompt,
        'Sen bir anime eleştirmeni ve yazarısın. Derinlemesine anime analizleri yazıyorsun. Türkçe yanıt ver.'
      ),
      this.makeOpenAIRequest(
        characterPrompt,
        'Sen bir karakter analisti ve psikologsun. Anime karakterlerinin psikolojik profillerini çıkarıyorsun. Türkçe yanıt ver.'
      )
    ]);

    return {
      summary,
      characterAnalysis
    };
  }
}

export const aiService = new AIService();