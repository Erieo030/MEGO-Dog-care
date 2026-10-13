import { Alert } from 'react-native';
import { Pet } from '../types';
import { reconcileAccountNotifications } from './notificationService';
export async function syncCareNotifications(userId: string, pets: Pet[]) {
  try {
    await reconcileAccountNotifications(userId, pets);
  } catch {
    const message = '紀錄已更新；手機通知同步失敗，回到首頁或重新開啟 App 時會重試。';
    Alert.alert('資料已儲存，通知尚未同步', message);
    return message;
  }
}
