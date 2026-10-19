import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  login as loginApi,
  yo as yoApi,
  getToken,
  setToken as guardarToken,
  ApiError,
} from '../api/client';

export const ROLE_LABELS = {
  estudiante: 'Estudiante',
  profesor: 'Docente',
  admin: 'Administrador',
  rectoria: 'Rectoría',
  talento_humano: 'Talento Humano',
  contabilidad: 'Contabilidad',
  admisiones: 'Coordinación de Admisiones',
  planeacion: 'Planeación',
  bienestar: 'Bienestar Universitario',
  registro: 'Registro y Control'
};

const AuthContext = createContext(null);

const initialsOf = (name) =>
  (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

/* Sesión a partir del usuario que devuelve la API (`publico`). */
const sesionDeServidor = (u) => {
  const session = {
    username: u.usuario,
    name: u.nombre,
    role: u.role,
    code: u.codigo,
    email: u.email,
    phone: u.telefono,
    address: u.direccion,
    program: u.programa,
    semester: u.semestre,
    department: u.departamento,
    avatarClass: u.avatarClass,
    inicio: new Date().toISOString(),
  };
  if (session.name) session.avatar = initialsOf(session.name);
  return session;
};

const leerSesion = () => {
  try {
    const saved = localStorage.getItem('uni_session');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const guardarSesion = (session) => {
  try {
    if (session) localStorage.setItem('uni_session', JSON.stringify(session));
    else localStorage.removeItem('uni_session');
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(leerSesion);
  const [token, setToken] = useState(getToken);
  const [offline, setOffline] = useState(false);

  /* Si hay token guardado, se comprueba contra la API. Un 401 limpia la sesión
     (el token venció); un fallo de red deja la sesión en modo offline. */
  useEffect(() => {
    if (!token) return;
    let vivo = true;
    yoApi()
      .then((u) => {
        if (!vivo) return;
        const session = sesionDeServidor(u);
        guardarSesion(session);
        setUser(session);
        setOffline(false);
      })
      .catch((err) => {
        if (!vivo) return;
        if (err instanceof ApiError && err.status === 401) {
          guardarToken(null);
          setToken(null);
          guardarSesion(null);
          setUser(null);
        } else {
          setOffline(true);
        }
      });
    return () => {
      vivo = false;
    };
  }, [token]);

  const login = async (username, password) => {
    const key = (username || '').trim().toUpperCase();

    try {
      const res = await loginApi(key, password);
      guardarToken(res.token);
      setToken(res.token);
      const session = sesionDeServidor(res.usuario);
      guardarSesion(session);
      setUser(session);
      setOffline(false);
      return { success: true, user: session };
    } catch (err) {
      /* La sesión SOLO se valida contra la base de datos, vía la API: sin
         servidor no hay ingreso (no hay credenciales de respaldo en el código). */
      const error =
        err instanceof ApiError
          ? err.status === 401
            ? 'Credenciales incorrectas'
            : err.message
          : 'No se pudo conectar con el servidor. Intenta de nuevo.';
      return { success: false, error };
    }
  };

  const logout = () => {
    guardarToken(null);
    setToken(null);
    guardarSesion(null);
    setUser(null);
    setOffline(false);
  };

  /* El token vive en localStorage, o sea que es compartido por TODAS las
     pestañas. Si en otra se inicia sesión como estudiante, esta pestaña sigue
     mostrando la interfaz de docente pero ya manda el token del estudiante:
     las notas y la asistencia se rechazan con 403 y parece un fallo del
     servidor. Aquí se revisa la sesión y, si el rol ya no es el que esta
     pantalla espera, se corta la sesión para volver a entrar con la cuenta
     correcta. */
  useEffect(() => {
    let revisando = false;
    const revisar = async () => {
      if (revisando) return;
      const t = getToken();
      if (!t) {
        setToken(null);
        setUser(null);
        return;
      }
      revisando = true;
      try {
        const u = await yoApi();
        const session = sesionDeServidor(u);
        setUser((prev) => {
          /* Mismo usuario y mismo rol: no se toca nada (un 403 legitimo, como
             no ser el docente titular de un curso, no debe cerrar la sesión). */
          if (prev && prev.role === session.role && prev.codigo === session.codigo) return prev;
          guardarSesion(session);
          return session;
        });
      } catch (err) {
        /* Solo un 401 significa token muerto. Un fallo de red o un 403 no
           pueden borrar la sesión: se perdería el acceso a pantalla sin
           motivo y la persona tendría que entrar de nuevo. */
        if (!(err instanceof ApiError) || err.status !== 401) return;
        guardarToken(null);
        setToken(null);
        guardarSesion(null);
        setUser(null);
      } finally {
        revisando = false;
      }
    };
    /* Cambio de token en otra pestaña. */
    const alCambiarToken = (e) => {
      if (e.key === 'uni_token' || e.key === 'uni_session') revisar();
    };
    /* El servidor rechazó la petición: se comprueba quién es ahora. */
    const alRechazar = () => revisar();
    window.addEventListener('storage', alCambiarToken);
    window.addEventListener('uni:sesion-rechazada', alRechazar);
    return () => {
      window.removeEventListener('storage', alCambiarToken);
      window.removeEventListener('uni:sesion-rechazada', alRechazar);
    };
  }, []);

  const updateProfile = (patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      if (patch.name) next.avatar = initialsOf(patch.name);
      guardarSesion(next);
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, token, offline, login, logout, updateProfile, roleLabels: ROLE_LABELS }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
