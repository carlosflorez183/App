import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Topbar({ title, subtitle, onToggleSidebar, notifications, onMarkNotifRead }) {
  const { user } = useAuth();
  const [showNotifs, setShowNotifs] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const unreadCount = notifications ? notifications.filter(n => !n.leida).length : 0;

  return (
    <div className="topbar">
      <div>
        <div className="tb-title">{title}</div>
        {subtitle && <div className="tb-sub">{subtitle}</div>}
      </div>

      <div className="tb-actions">
        {/* Barra de búsqueda clásica */}
        <div className="tb-search">
          <span style={{ fontSize: 13, color: '#64748b' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
          />
        </div>

        {/* Notificaciones */}
        <div style={{ position: 'relative' }}>
          <div className="ic-btn" onClick={() => setShowNotifs(!showNotifs)}>
            🔔
            {unreadCount > 0 && <div className="dot" />}
          </div>

          {showNotifs && (
            <div className="notif-panel open" style={{ right: 0, top: 48 }}>
              <div className="notif-head">
                <span>Notificaciones ({unreadCount})</span>
                <button onClick={() => setShowNotifs(false)}>Cerrar</button>
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {notifications && notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="notif-item"
                      onClick={() => onMarkNotifRead && onMarkNotifRead(n.id)}
                      style={{ cursor: 'pointer', background: n.leida ? '#fff' : '#f0f9ff' }}
                    >
                      <div
                        className="notif-ic"
                        style={{ background: n.tipo === 'success' ? '#dcfce7' : n.tipo === 'warning' ? '#fef9c3' : '#dbeafe' }}
                      >
                        {n.tipo === 'success' ? '✅' : n.tipo === 'warning' ? '⚠️' : 'ℹ️'}
                      </div>
                      <div className="notif-txt flex-1">
                        <p>{n.titulo}</p>
                        <span>{n.msg}</span>
                        <small>{n.tiempo}</small>
                      </div>
                      {!n.leida && <div className="notif-dot" />}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: 18, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                    Sin notificaciones
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tarjeta de usuario */}
        <div className="tb-user">
          <div className={`tb-av ${user?.avatarClass || 'av-blue'}`}>
            {user?.avatar || 'CA'}
          </div>
          <span className="tb-name">
            {user?.name ? user.name.split(' ')[0] : 'Carlos'}
          </span>
          <span style={{ fontSize: 10, color: '#94a3b8' }}>▾</span>
        </div>
      </div>
    </div>
  );
}
