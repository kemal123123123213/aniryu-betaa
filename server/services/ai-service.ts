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
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json() as OpenAIResponse;
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error making OpenAI request:', error);
      return 'Şu anda öneriler kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
    }
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