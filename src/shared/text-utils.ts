export function cleanLLMOutput(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\n*```json[\s\S]*?```$/g, '') // Убираем блоки кода
    .replace(/<markdown>[\s\S]*?<\/markdown>/gi, '') // Убираем markdown
    .replace(/<code>[\s\S]*?<\/code>/gi, '') // Убираем кодовые блоки

    .replace(/<pre>[\s\S]*?<\/pre>/gi, '') // Убираем преформатированный текст
    .replace(/^[\s]+|[\s]+$/g, '') // Убираем пустые строки
    .replace(/\n/g, '') // Убираем все переводы строк;
    .trim();
}

export function intentToSentenceNatural(intent: {
  who?: string;
  what?: string;
  when?: string;
  where?: string;
  why?: string;
  how?: string;
}): string {
  const segments: string[] = [];

  if (intent.who) segments.push(intent.who);
  if (intent.what) segments.push(intent.what);
  if (intent.when) segments.push(`when ${intent.when}`);
  if (intent.where) segments.push(`at ${intent.where}`);
  if (intent.why) segments.push(`to ${intent.why}`);
  if (intent.how) segments.push(`by ${intent.how}`);

  return segments.join(' ') + '.';
}
