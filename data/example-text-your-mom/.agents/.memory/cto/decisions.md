

## 2026-04-13T06:04:07.717Z
Reminder delivery should migrate from device-local scheduling to server-triggered push notifications. Local scheduling is fundamentally unreliable on both iOS (BGTaskScheduler) and Android (WorkManager/Doze). This architectural change should be planned during P2 since the entire smarter timing initiative depends on reliable, observable delivery.