/* =============================================
   Estado compartido de la aplicación.

   Fuente de verdad: la API (`GET /api/bootstrap`). Mientras llega, y si la API
   no está disponible, se usa la copia local y, en último término, el mock.
   Así la interfaz nunca se queda en blanco: si Docker está apagado, arranca en
   modo demostración con los mismos datos.

   El valor guardado en localStorage actúa solo como caché para pintar al
   instante en la siguiente carga.
   ============================================= */
import { useCallback, useEffect, useState } from 'react';
import { INITIAL_DATA } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { bootstrap, getToken } from '../api/client';

export const DATA_KEY = 'uni_data';
// Súbelo cada vez que cambie la forma de INITIAL_DATA: descarta el estado
// guardado en el navegador y vuelve a cargar.
export const DATA_VERSION = 8;

function loadCache() {
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

function guardarCache(data) {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify({ v: DATA_VERSION, data }));
  } catch {
    // Sin espacio o almacenamiento bloqueado: la app sigue funcionando.
  }
}

/* Devuelve [data, setData, { fuente, cargando, error, recargar }].
   - fuente: 'api' cuando los datos vienen del servidor, 'mock' si no.
   - recargar: vuelve a pedir el estado al servidor (se usa tras una acción). */
export function usePersistentData() {
  const { token } = useAuth();
  const [data, setData] = useState(loadCache);
  const [fuente, setFuente] = useState('mock');
  const [cargando, setCargando] = useState(() => Boolean(getToken()));
  const [error, setError] = useState(null);

  const recargar = useCallback(async () => {
    if (!getToken()) {
      setFuente('mock');
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      const fresco = await bootstrap();
      setData({ ...INITIAL_DATA, ...fresco });
      setFuente('api');
      setError(null);
    } catch (err) {
      // El servidor no respondió o rechazó el token: se conserva lo que hay.
      setFuente('mock');
      setError(err);
    } finally {
      setCargando(false);
    }
  }, []);

  // Se recarga al entrar y cada vez que cambia la sesión (login/logout).
  useEffect(() => {
    recargar();
  }, [recargar, token]);

  useEffect(() => {
    guardarCache(data);
  }, [data]);

  return [data, setData, { fuente, cargando, error, recargar }];
}
