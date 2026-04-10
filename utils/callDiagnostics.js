import * as FileSystem from 'expo-file-system';

const LOG_FILE_NAME = 'videocall_diagnostics.txn';

export const CALL_LOG_PATH = `${FileSystem.documentDirectory}${LOG_FILE_NAME}`;

function formatLogLine(level, message, payload) {
  const timestamp = new Date().toISOString();
  const payloadText =
    payload === undefined
      ? ''
      : ` | ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`;
  return `[${timestamp}] [${level}] ${message}${payloadText}\n`;
}

export async function appendCallLog(level, message, payload) {
  try {
    const line = formatLogLine(level, message, payload);
    await FileSystem.writeAsStringAsync(CALL_LOG_PATH, line, {
      encoding: FileSystem.EncodingType.UTF8,
      append: true,
    });
  } catch (error) {
    // Evitar que un fallo de logging rompa la videollamada.
    console.warn('No se pudo escribir log de videollamada:', error?.message || error);
  }
}

export async function clearCallLog() {
  try {
    const info = await FileSystem.getInfoAsync(CALL_LOG_PATH);
    if (info.exists) {
      await FileSystem.deleteAsync(CALL_LOG_PATH, { idempotent: true });
    }
  } catch (error) {
    console.warn('No se pudo limpiar log de videollamada:', error?.message || error);
  }
}

export async function readCallLog() {
  try {
    const info = await FileSystem.getInfoAsync(CALL_LOG_PATH);
    if (!info.exists) {
      return '';
    }

    return await FileSystem.readAsStringAsync(CALL_LOG_PATH, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (error) {
    console.warn('No se pudo leer log de videollamada:', error?.message || error);
    return '';
  }
}
