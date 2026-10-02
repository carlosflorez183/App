import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  login as loginApi,
  yo as yoApi,
  getToken,
  setToken as guardarToken,
  ApiError,
} from '../api/client';

/* Usuarios de respaldo. Se usan cuando la API no está disponible (demostración
   sin Docker) y para el selector de acceso rápido del login. */
const USERS = {
  'EST001': { password:'123456', role:'estudiante', name:'Carlos Andrés Martínez', code:'20231001', email:'c.martinez@uni.edu.co', phone:'310 456 7890', address:'Cra. 12 #45-67, Bogotá', program:'Ingeniería de Sistemas', semester:'6', avatar:'CA', avatarClass:'av-blue' },
  'PROF001': { password:'123456', role:'profesor', name:'Dra. Laura Sánchez', code:'DOC-0045', email:'l.sanchez@uni.edu.co', phone:'311 222 3344', address:'Cra. 7 #89-10, Bogotá', department:'Facultad de Ingeniería', avatar:'LS', avatarClass:'av-purple' },
  'ADMIN': { password:'admin123', role:'admin', name:'Administrador General', code:'ADM-001', email:'admin@uni.edu.co', phone:'318 555 1122', address:'Cra. 1 #2-3, Bogotá', avatar:'AG', avatarClass:'av-green' },
  'RECTOR': { password:'rector123', role:'rectoria', name:'Rector Juan Pablo Gómez', code:'REC-001', email:'rector@uni.edu.co', phone:'300 111 2233', address:'Cra. 5 #6-7, Bogotá', avatar:'JG', avatarClass:'av-red' },
  'TALENTO': { password:'123456', role:'talento_humano', name:'María Fernanda López', code:'TH-002', email:'m.lopez@uni.edu.co', phone:'315 909 1212', address:'Cra. 9 #30-25, Bogotá', avatar:'ML', avatarClass:'av-yellow' },
  'CONTA': { password:'123456', role:'contabilidad', name:'Jorge Alberto Ríos', code:'CONT-003', email:'j.rios@uni.edu.co', phone:'316 404 5050', address:'Cra. 3 #14-8, Bogotá', avatar:'JR', avatarClass:'av-blue' },
  'ADMI': { password:'123456', role:'admisiones', name:'Ana Camila Restrepo', code:'ADM-004', email:'a.restrepo@uni.edu.co', phone:'317 222 9911', address:'Cra. 11 #22-33, Bogotá', department:'Coordinación de Admisiones', avatar:'AR', avatarClass:'av-purple' },
};

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

/* Sesión de respaldo a partir de la tabla local (sin API). */
const buildSession = (key, overrides) => {
  const { password: _pw, ...rest } = USERS[key];
  const session = {
    ...rest,
    username: key,
    loginTime: new Date().toISOString(),
    offline: true,
    ...overrides,
  };
  if (session.name) session.avatar = initialsOf(session.name);
  return session;
};

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
      /* Sin servidor: se cae al respaldo local para no dejar la demo inservible. */
      const sinServidor = err instanceof TypeError;
      const local = USERS[key];
      if (sinServidor && local && local.password === password) {
        const session = buildSession(key);
        guardarToken(null);
        setToken(null);
        guardarSesion(session);
        setUser(session);
        setOffline(true);
        return { success: true, user: session, offline: true };
      }
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
      value={{ user, token, offline, login, logout, updateProfile, roleLabels: ROLE_LABELS, demoUsers: USERS }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
