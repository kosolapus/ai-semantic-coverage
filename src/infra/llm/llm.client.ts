import { Injectable, Logger } from '@nestjs/common';
import ollama from 'ollama';
import { v4 as uuidv4 } from 'uuid'; // Для генерации уникальных ID

function cleanLLMOutput(raw: string): string {
  // Удаляем все <think>...</think> и лишние пробелы
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned

    .replace(/^\n*```json[\s\S]*?```$/g, '') // Убираем блоки кода
    .replace(/<markdown>[\s\S]*?<\/markdown>/gi, '') // Убираем markdown
    .replace(/<code>[\s\S]*?<\/code>/gi, '') // Убираем кодовые блоки
    .replace(/<pre>[\s\S]*?<\/pre>/gi, '') // Убираем преформатированный текст
    .replace(/^[\s]+|[\s]+$/g, '') // Убираем пустые строки
    .replace(/\n/g, '') // Убираем все переводы строк;
    .trim();
  return cleaned;
}

@Injectable()
export class LLMClient {
  private readonly logger = new Logger(LLMClient.name);
  private readonly model = 'rnj-1:8b-cloud';
  private readonly timeout = 10000; // 10 секунд ожидания

  constructor() {
    // Подключение к Ollama (если нужно)
    // ollama.connect(); // Если используется локальный сервер
  }

  async generateChunking(
    fileContent: string,
    filePath: string,
  ): Promise<LLMChunk[]> {
    try {
      // Улучшенный промпт с более четкими инструкциями
      const prompt = `
      Вы анализируете следующий код и должны разделить его на логические блоки.
      1. Если файл не является кодом или тестами - верните пустой массив
      2. Каждый блок должен содержать:
         - Уникальный идентификатор (UUID)
         - Линейные координаты (startLine, endLine)
         - Тип блока (test_case, helper или unknown)
         - Краткое описание (1-2 предложения)
         - Саму логику блока
      3. Формат ответа: строго JSON массив
      4. Не добавляйте комментарии или объяснения
      5. Если блок слишком большой - разбивайте его на несколько частей

      Файл: ${filePath}
      Содержимое:
      ${fileContent}
      `;

      this.logger.log(`Запуск анализа для ${filePath}`);

      const response = await ollama.generate({
        options: {},
        model: this.model,
        prompt: prompt,
        think: false,
        stream: false,
        system: `
        Вы строгий аналитик кода. Ваша задача - максимально точно разделить код на независимые блоки.
        Не делайте предположений о бизнес-логике, только о структуре кода.
        `,
      });

      const cleanedOutput = cleanLLMOutput(response.response);
      this.logger.log('cleaned:', cleanedOutput);
      const parsedOutput = JSON.parse(cleanedOutput);

      // Дополнительная валидация ответа
      if (!Array.isArray(parsedOutput)) {
        throw new Error('Ожидался массив JSON');
      }

      // Дополнительная обработка ответов
      return parsedOutput.map((chunk) => ({
        ...chunk,
        chunkId: chunk.chunkId || uuidv4(), // Уникальный ID
        type: chunk.type || 'unknown', // Защита от пустых значений
      }));
    } catch (error) {
      this.logger.error(`Ошибка при обработке ${filePath}:`, error.message);
      throw new Error(`Произошла ошибка при разделении кода: ${error.message}`);
    }
  }
}

export interface LLMChunk {
  chunkId: string;
  startLine: number;
  endLine: number;
  type: 'test_case' | 'helper' | 'unknown';
  summary: string;
  text: string;
}
