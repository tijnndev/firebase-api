import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from "@capacitor/core";
import { registerToken } from './api/backend';
import logger from './logger';

export const requestNotificationPermission = async () => {
  try {
    if (Capacitor.getPlatform() !== "web") {
      logger.info("Using native platform for FCM token registration.");
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== "granted") {
        logger.warn("Push notifications permission denied on native platform.");
        return;
      }
    }

    logger.info("Fetching token.");
    let token;
    if (Capacitor.getPlatform() === "android") {
      logger.info("Fetching token for native platform.");
      token = await new Promise((resolve, reject) => {
        PushNotifications.register().then(() => {
          PushNotifications.addListener('registration', (token) => {
            resolve(token.value);
          });
        }).catch((error) => {
          reject(error);
        });
      });
      logger.info("Native FCM token: " + token);
    }

    logger.log('Trying to register token:', token);
    await registerToken(token);
  } catch (error) {
    logger.error("Error fetching FCM token: " + error);
  }
};