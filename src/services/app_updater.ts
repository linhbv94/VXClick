import { useEffect, useSyncExternalStore } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { createUpdateController, type UpdateState } from './update_controller';
import packageInfo from '../../package.json';

export const appVersion = packageInfo.version;

const controller = createUpdateController({
  enabled: isTauri() && !import.meta.env.DEV && getCurrentWindow().label === 'main',
  currentVersion: appVersion,
  check,
  relaunch,
  beforeInstall: async () => { await invoke('prepare_app_update'); },
  installFailed: async () => { await invoke('cancel_app_update'); },
});

export const {
  checkForUpdates,
  installUpdate,
  restartAfterUpdate,
  dismissUpdateNotice,
} = controller;

export function useAppUpdater(): UpdateState {
  const state = useSyncExternalStore(controller.subscribe, controller.snapshot);
  useEffect(controller.start, []);
  return state;
}
