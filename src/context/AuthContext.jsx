import React, { createContext, useContext, useState, useEffect } from 'react';

const USERS = {
  'EST001': { password:'123456', role:'estudiante', name:'Carlos Andrés Martínez', code:'20231001', email:'c.martinez@uni.edu.co', program:'Ingeniería de Sistemas', semester:'6', avatar:'CA', avatarClass:'av-blue' },
  'PROF001': { password:'123456', role:'profesor', name:'Dra. Laura Sánchez', code:'DOC-0045', email:'l.sanchez@uni.edu.co', department:'Facultad de Ingeniería', avatar:'LS', avatarClass:'av-purple' },
  'ADMIN': { password:'admin123', role:'admin', name:'Administrador General', code:'ADM-001', email:'admin@uni.edu.co', avatar:'AG', avatarClass:'av-green' },
  'RECTOR': { password:'rector123', role:'rectoria', name:'Rector Juan Pablo Gómez', code:'REC-001', email:'rector@uni.edu.co', avatar:'JG', avatarClass:'av-red' },
  'TALENTO': { password:'123456', role:'talento_humano', name:'María Fernanda López', code:'TH-002', email:'m.lopez@uni.edu.co', avatar:'ML', avatarClass:'av-yellow' },
  'CONTA': { password:'123456', role:'contabilidad', name:'Jorge Alberto Ríos', code:'CONT-003', email:'j.rios@uni.edu.co', avatar:'JR', avatarClass:'av-blue' },
};

export const ROLE_LABELS = {
  estudiante: 'Estudiante',
  profesor: 'Docente',
  admin: 'Administrador',
  rectoria: 'Rectoría',
  talento_humano: 'Talento Humano',
  contabilidad: 'Contabilidad',
  planeacion: 'Planeación',
  bienestar: 'Bienestar Universitario',
  registro: 'Registro y Control'
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('uni_session');
      return saved ? JSON.parse(saved) : USERS['EST001'];
    } catch {
      return USERS['EST001'];
    }
  });

  const login = (username, password) => {
    const key = (username || '').trim().toUpperCase();
    const found = USERS[key];
    if (found && found.password === password) {
      const session = { ...found, username: key, loginTime: new Date().toISOString() };
      delete session.password;
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

  return (
    <AuthContext.Provider value={{ user, login, logout, roleLabels: ROLE_LABELS, demoUsers: USERS }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
