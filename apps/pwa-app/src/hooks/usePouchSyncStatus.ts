import { useState, useEffect } from 'react';
import { TSyncStatus, forceManualSync, startLiveSync, stopLiveSync } from '../db/pouchdb.ts';

/**
 * Custom React Hook to track the native PouchDB-to-CouchDB synchronization status,
 * handle background toast alerts, and dynamically manage the replication loops'
 * lifecycle based on active backend reachability.
 */
export const usePouchSyncStatus = (isBackendOnline: boolean) => {
  const [syncStatus, setSyncStatus] = useState<TSyncStatus>('offline');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 1. Manage sync lifecycle based on backend reachability (battery protection)
  useEffect(() => {
    if (isBackendOnline) {
      console.log('[PouchDB Sync Hook] Backend online. Starting replication loops.');
      startLiveSync();
    } else {
      console.log('[PouchDB Sync Hook] Backend offline. Cancelling replication loops to conserve battery.');
      stopLiveSync();
    }
  }, [isBackendOnline]);

  // 2. Listen to PouchDB native synchronization status updates
  useEffect(() => {
    const handleSyncStatus = (e: Event) => {
      const status = (e as CustomEvent).detail as TSyncStatus;
      setSyncStatus(status);
    };

    window.addEventListener('afiyet_sync_status', handleSyncStatus);
    return () => {
      window.removeEventListener('afiyet_sync_status', handleSyncStatus);
    };
  }, []);

  // 3. Listen to toast messages from the sync engine
  useEffect(() => {
    let timer: any;
    const handleToast = (e: Event) => {
      const detail = (e as CustomEvent).detail as { type: 'success' | 'error'; message: string };
      setToast(detail);
      
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setToast(null);
      }, 4000);
    };

    window.addEventListener('afiyet_sync_toast', handleToast);
    return () => {
      window.removeEventListener('afiyet_sync_toast', handleToast);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleSyncClick = async () => {
    if (syncStatus === 'syncing') return;
    try {
      await forceManualSync();
    } catch (err) {
      // Handled inside forceManualSync
    }
  };

  return {
    syncStatus,
    toast,
    handleSyncClick
  };
};
