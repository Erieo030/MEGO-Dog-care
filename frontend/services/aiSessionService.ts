import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIUsage, ChatKnowledgeSource, ChatSource } from './aiService';

const key = (userId: string, petId: string) => `mego:ai-session:${userId}:${petId}`;
const historyKey = (userId: string, petId: string) => `mego:ai-sessions:${userId}:${petId}`;
let sessionIdSequence = 0;
const createSessionId = () => {
  sessionIdSequence = (sessionIdSequence + 1) % Number.MAX_SAFE_INTEGER;
  return `session-${Date.now()}-${sessionIdSequence}`;
};
export type StoredMessage = {
  role: 'user' | 'assistant';
  text: string;
  sources?: ChatSource[];
  knowledgeSources?: ChatKnowledgeSource[];
  contextTokens?: number;
  generationMode?: string;
};
export type AISession = { sessionId?: string; messages?: StoredMessage[]; usage?: AIUsage };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const validMessages = (value: unknown) =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      isObject(item) &&
      (item.role === 'user' || item.role === 'assistant') &&
      typeof item.text === 'string' &&
      (item.sources === undefined ||
        (Array.isArray(item.sources) &&
          item.sources.every(
            (source) =>
              isObject(source) &&
              typeof source.type === 'string' &&
              typeof source.label === 'string',
          ))) &&
      (item.knowledgeSources === undefined ||
        (Array.isArray(item.knowledgeSources) &&
          item.knowledgeSources.every(
            (source) =>
              isObject(source) &&
              ['title', 'documentTitle', 'section', 'url'].every(
                (field) => typeof source[field] === 'string',
              ),
          ))) &&
      (item.contextTokens === undefined ||
        (typeof item.contextTokens === 'number' && Number.isFinite(item.contextTokens))) &&
      (item.generationMode === undefined || typeof item.generationMode === 'string'),
  );
const invalidStorage = () => new Error('本機對話資料無法讀取，請重新載入；原資料尚未變更。');
const queues = new Map<string, Promise<unknown>>();
function mutate<T>(userId: string, petId: string, action: () => Promise<T>): Promise<T> {
  const owner = key(userId, petId);
  const next = (queues.get(owner) ?? Promise.resolve()).catch(() => undefined).then(action);
  queues.set(owner, next);
  void next
    .finally(() => {
      if (queues.get(owner) === next) queues.delete(owner);
    })
    .catch(() => undefined);
  return next;
}
export async function loadAISession(userId: string, petId: string): Promise<AISession> {
  const stored = await AsyncStorage.getItem(key(userId, petId));
  if (stored === null) return {};
  const value: unknown = JSON.parse(stored);
  if (
    !isObject(value) ||
    (value.sessionId !== undefined && (typeof value.sessionId !== 'string' || !value.sessionId)) ||
    (value.messages !== undefined && !validMessages(value.messages)) ||
    (value.usage !== undefined && (!isObject(value.usage) || typeof value.usage.used !== 'number'))
  )
    throw invalidStorage();
  return value as AISession;
}
async function writeSession(userId: string, petId: string, value: AISession) {
  await AsyncStorage.setItem(key(userId, petId), JSON.stringify(value));
}
export async function saveAISession(userId: string, petId: string, value: AISession) {
  return mutate(userId, petId, async () => {
    await loadAISession(userId, petId);
    await loadAISessions(userId, petId);
    await writeSession(userId, petId, value);
  });
}

export type AISessionRecord = {
  id: string;
  title: string;
  messages: StoredMessage[];
  createdAt: string;
  updatedAt: string;
};
export async function loadAISessions(userId: string, petId: string): Promise<AISessionRecord[]> {
  const stored = await AsyncStorage.getItem(historyKey(userId, petId));
  if (stored === null) return [];
  const value: unknown = JSON.parse(stored);
  if (
    !Array.isArray(value) ||
    !value.every(
      (item) =>
        isObject(item) &&
        typeof item.id === 'string' &&
        Boolean(item.id) &&
        typeof item.title === 'string' &&
        typeof item.createdAt === 'string' &&
        Number.isFinite(Date.parse(item.createdAt)) &&
        typeof item.updatedAt === 'string' &&
        Number.isFinite(Date.parse(item.updatedAt)) &&
        validMessages(item.messages),
    )
  )
    throw invalidStorage();
  return value as AISessionRecord[];
}

export async function deleteAISession(userId: string, petId: string, sessionId: string) {
  return mutate(userId, petId, async () => {
    const sessions = await loadAISessions(userId, petId);
    await AsyncStorage.setItem(
      historyKey(userId, petId),
      JSON.stringify(sessions.filter((item) => item.id !== sessionId)),
    );
  });
}

export async function clearAccountAISessions(userId: string) {
  const prefixes = [`mego:ai-session:${userId}:`, `mego:ai-sessions:${userId}:`];
  const keys = await AsyncStorage.getAllKeys();
  const ownedKeys = keys.filter((storedKey) =>
    prefixes.some((prefix) => storedKey.startsWith(prefix)),
  );
  if (ownedKeys.length) await AsyncStorage.multiRemove(ownedKeys);
}

export async function activateAISession(userId: string, petId: string, session: AISessionRecord) {
  return mutate(userId, petId, async () => {
    const current = await loadAISession(userId, petId);
    await loadAISessions(userId, petId);
    await writeSession(userId, petId, {
      sessionId: session.id,
      messages: session.messages,
      usage: current.usage,
    });
  });
}
export async function activateEmptyAISession(userId: string, petId: string) {
  return mutate(userId, petId, async () => {
    const current = await loadAISession(userId, petId);
    await loadAISessions(userId, petId);
    const sessionId = createSessionId();
    await writeSession(userId, petId, { sessionId, messages: [], usage: current.usage });
    return sessionId;
  });
}
export async function saveActiveAISession(
  userId: string,
  petId: string,
  sessionId: string,
  messages: StoredMessage[],
  usage?: AIUsage,
) {
  if (!sessionId || !validMessages(messages)) throw invalidStorage();
  return mutate(userId, petId, async () => {
    // Read before either write: corrupt storage must never be replaced by an empty history.
    const current = await loadAISession(userId, petId);
    const sessions = await loadAISessions(userId, petId);
    const now = new Date().toISOString();
    const previous = sessions.find((item) => item.id === sessionId);
    const record: AISessionRecord = {
      id: sessionId,
      title: messages.find((message) => message.role === 'user')?.text.slice(0, 24) || '新的對話',
      messages,
      createdAt: previous?.createdAt || now,
      updatedAt: now,
    };
    const updated = [record, ...sessions.filter((item) => item.id !== sessionId)]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5);
    await AsyncStorage.setItem(historyKey(userId, petId), JSON.stringify(updated));
    // A delayed reply belongs to the request's ID; it must not activate A over a newer B.
    if (current.sessionId === sessionId)
      await writeSession(userId, petId, { sessionId, messages, usage });
  });
}
