/* =============================================
   Persistencia compartida del estado de demo.
   Dashboard y los módulos por rol usan esta misma
   capa, así que las notificaciones leídas o los
   cambios de admisiones se ven igual en todos.
   ============================================= */
import { useEffect, useState } from 'react';
import { INITIAL_DATA } from '../data/mockData';

export const DATA_KEY = 'uni_data';
export const DATA_VERSION = 5;

function loadData() {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && saved.v === DATA_VERSION && saved.data) {
        return { ...INITIAL_DATA, ...saved.data };
      }
    }
  } catch {
    // Datos corruptos: se descarta y se usa el mock.
  }
  return INITIAL_DATA;
}

export function usePersistentData() {
  const [data, setData] = useState(loadData);

  useEffect(() => {
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify({ v: DATA_VERSION, data }));
    } catch {
      // Sin espacio o almacenamiento bloqueado: la app sigue funcionando.
    }
  }, [data]);

  return [data, setData];
}
