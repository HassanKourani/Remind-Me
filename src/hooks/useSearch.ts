import { useState, useEffect, useRef } from 'react';
import { Reminder } from '@/types/database';

export function useSearch(reminders: Reminder[] | undefined, delay = 300) {
  const [query, setQuery] = useState('');
  const [filteredResults, setFilteredResults] = useState<Reminder[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!query.trim()) {
      setFilteredResults(reminders ?? []);
      return;
    }

    timerRef.current = setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      const filtered = (reminders ?? []).filter(
        (r) =>
          r.title.toLowerCase().includes(lowerQuery) ||
          (r.notes && r.notes.toLowerCase().includes(lowerQuery))
      );
      setFilteredResults(filtered);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, reminders, delay]);

  return { query, setQuery, filteredResults };
}
