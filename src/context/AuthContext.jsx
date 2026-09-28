import React, { createContext, useContext, useState } from 'react';

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

const buildSession = (key, overrides) => {
  const { password: _pw, ...rest } = USERS[key];
  const session = {
    ...rest,
    username: key,
    loginTime: new Date().toISOString(),
    ...overrides,
  };
  if (session.name) session.avatar = initialsOf(session.name);
  return session;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('uni_session');
      return saved ? JSON.parse(saved) : buildSession('EST001');
    } catch {
      return buildSession('EST001');
    }
  });

  const login = (username, password) => {
    const key = (username || '').trim().toUpperCase();
    const found = USERS[key];
    if (found && found.password === password) {
      const session = buildSession(key);
      localStorage.setItem('uni_session', JSON.stringify(session));
      setUser(session);
      return { success: true, user: session };
    }
    return { success: false, error: 'Credenciales incorrectas' };
  };

  const logout = () => {
    localStorage.removeItem('uni_session');
    setUser(null);
  };

  const updateProfile = (patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      if (patch.name) next.avatar = initialsOf(patch.name);
      localStorage.setItem('uni_session', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, roleLabels: ROLE_LABELS, demoUsers: USERS }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
