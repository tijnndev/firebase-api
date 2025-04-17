import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { registerToken } from './api/backend';
import logger from './logger';

export const requestNotificationPermission = async () => {
  try {
    if (Capacitor.getPlatform() === 'web') return;

    logger.info('Requesting push notification permissions...');
    const permission = await PushNotifications.requestPermissions();

    if (permission.receive !== 'granted') {
      logger.warn('Push notifications permission denied.');
      return;
    }

    logger.info('Registering for push notifications...');
    await PushNotifications.register();

    const token = await new Promise((resolve, reject) => {
      const onRegister = (token) => {
        PushNotifications.removeAllListeners();
        resolve(token.value);
      };

      const onRegistrationError = (error) => {
        PushNotifications.removeAllListeners();
        reject(error);
      };

      PushNotifications.addListener('registration', onRegister);
      PushNotifications.addListener('registrationError', onRegistrationError);
    });

    logger.info(`FCM token obtained: ${token}`);
    await registerToken(token);
    logger.info('FCM token registered with backend.');
  } catch (error) {
    logger.error(`Failed to initialize push notifications: ${error}`);
  }
};
