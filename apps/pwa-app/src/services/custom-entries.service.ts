import { useState, useEffect, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { ICustomEntry } from '@afiyet/shared';
import { customEntriesDb } from '../db/pouchdb.ts';

export const useCustomEntries = () => {
  const [entries, setEntries] = useState<ICustomEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const result = await customEntriesDb.allDocs({ include_docs: true });
      const list = result.rows
        .map((row) => row.doc)
        .filter((doc): doc is ICustomEntry & { _rev: string } => !!doc && doc.type === 'custom_entry');
      setEntries(list);
    } catch (err) {
      console.error('[Custom Entries Service] Failed to load custom entries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getCustomValues = useCallback(
    (field: ICustomEntry['field']): string[] => {
      return entries.filter((e) => e.field === field).map((e) => e.value);
    },
    [entries]
  );

  const addCustomValue = async (field: ICustomEntry['field'], value: string) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return;

    // Check if it already exists in the state/database to prevent duplicates
    const alreadyExists = entries.some(
      (e) => e.field === field && e.value.toLowerCase() === trimmedValue.toLowerCase()
    );
    if (alreadyExists) return;

    try {
      const doc: ICustomEntry = {
        _id: `custom_${field}_${nanoid()}`,
        type: 'custom_entry',
        field,
        value: trimmedValue,
        createdAt: new Date().toISOString(),
      };
      await customEntriesDb.put(doc);
      console.log(`[Custom Entries Service] Added custom value "${trimmedValue}" for field "${field}"`);
      await loadEntries();
      // Notify other parts of the app
      window.dispatchEvent(new CustomEvent('afiyet_data_changed'));
    } catch (err) {
      console.error('[Custom Entries Service] Failed to add custom value:', err);
      throw err;
    }
  };

  const getMergedOptions = useCallback(
    (field: ICustomEntry['field'], presets: readonly string[]): string[] => {
      const customValues = getCustomValues(field);
      const combined = [...presets, ...customValues];
      // Deduplicate case-insensitively but preserve case
      const seen = new Set<string>();
      return combined.filter((val) => {
        const lower = val.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      });
    },
    [getCustomValues]
  );

  useEffect(() => {
    loadEntries();

    const handleRefresh = () => {
      loadEntries();
    };

    window.addEventListener('afiyet_data_changed', handleRefresh);
    return () => {
      window.removeEventListener('afiyet_data_changed', handleRefresh);
    };
  }, [loadEntries]);

  return {
    loading,
    entries,
    loadEntries,
    getCustomValues,
    addCustomValue,
    getMergedOptions,
  };
};
